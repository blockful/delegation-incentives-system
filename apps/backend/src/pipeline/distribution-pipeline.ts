import type { IncentivesDataSource } from "@/data/interfaces.js";
import {
  type DistributionResult,
  type DelegateScore,
  type DelegatorScore,
  type RewardAllocation,
  type Seconds,
  type Wei,
  wei,
  seconds,
  basisPoints,
  ONE_ENS,
  TWB_WINDOW_SECONDS,
  PROPOSAL_WINDOW_SIZE,
} from "@/domain/types.js";
import { identifyActiveDelegates } from "@/domain/active-delegates.js";
import { determinePoolTier } from "@/domain/pool-sizing.js";
import { computeTimeWeightedBalance } from "@/domain/time-weighted-balance.js";
import { computeDelegateRewards } from "@/domain/delegate-rewards.js";
import { computeDelegatorRewards } from "@/domain/delegator-rewards.js";
import { runLottery } from "@/domain/lottery.js";
import { consolidateDelegators } from "@/domain/protocol-dedup.js";
import { POOL_TIERS, MIN_PAYOUT_THRESHOLD, LOTTERY_TARGET_POOL_SIZE } from "@/config.js";
import { sum, percentageGrowthBps } from "@/util/bigint-math.js";
import {
  parseMonth,
  monthStartTimestamp,
  monthEndTimestamp,
  previousMonth,
} from "@/util/time.js";
import { invariant } from "@/util/invariant.js";

export interface PipelineInput {
  month: string; // "YYYY-MM"
  dataSource: IncentivesDataSource;
}

/**
 * Run the full distribution pipeline for a given month.
 * This is the main orchestrator that calls all domain modules in sequence.
 */
export async function runDistributionPipeline(
  input: PipelineInput,
): Promise<DistributionResult> {
  const { month, dataSource } = input;

  // Step 1: Resolve time boundaries
  const { year, month: monthNum } = parseMonth(month);
  const monthStart = monthStartTimestamp(year, monthNum);
  const monthEnd = monthEndTimestamp(year, monthNum);
  const twbWindowStart = seconds(
    (monthEnd as bigint) - (TWB_WINDOW_SECONDS as bigint),
  );

  const prevMonthStr = previousMonth(month);
  const { year: prevYear, month: prevMonthNum } = parseMonth(prevMonthStr);
  const prevMonthEnd = monthEndTimestamp(prevYear, prevMonthNum);

  // Step 2: Fetch proposals and votes
  const proposals = await dataSource.proposals.getRecentProposals(
    PROPOSAL_WINDOW_SIZE,
  );
  const proposalIds = proposals.map((p) => p.id);
  const votes = await dataSource.votes.getVotesForProposals(proposalIds);

  // Step 3: Identify active delegates
  const activeDelegateIds = identifyActiveDelegates(proposals, votes);

  if (activeDelegateIds.size === 0) {
    return emptyResult(month, monthEnd);
  }

  const activeDelegateArray = Array.from(activeDelegateIds);

  // Step 4: Compute MoM VP growth and determine pool tier
  const currentAVP = await dataSource.votingPower.getAggregateDelegatedPower(
    activeDelegateArray,
    monthEnd,
  );
  const previousAVP = await dataSource.votingPower.getAggregateDelegatedPower(
    activeDelegateArray,
    prevMonthEnd,
  );

  const momGrowthBps = percentageGrowthBps(
    currentAVP as bigint,
    previousAVP as bigint,
  );
  const poolTier = determinePoolTier(currentAVP, previousAVP, POOL_TIERS);
  const monthlyPool = poolTier.poolSize;

  // Step 5: Compute average voting power for each active delegate
  const vpHistory = await dataSource.votingPower.getVotingPowerHistory(
    activeDelegateArray,
    monthStart,
    monthEnd,
  );

  // Get initial VP at month start for each delegate
  const delegateScores: DelegateScore[] = [];
  for (const delegateId of activeDelegateArray) {
    const delegateEvents = vpHistory
      .filter((s) => s.accountId === delegateId)
      .map((s) => ({
        accountId: s.accountId,
        balance: s.votingPower, // reuse TWB algo for VP
        delta: s.delta,
        timestamp: s.timestamp,
      }));

    // Get initial VP before month start
    const preMonthEvents = (
      await dataSource.votingPower.getVotingPowerHistory(
        [delegateId],
        seconds(0n),
        monthStart,
      )
    ).sort((a, b) => Number(b.timestamp - a.timestamp));
    const initialVP = preMonthEvents.length > 0 ? preMonthEvents[0].votingPower : wei(0n);

    const avgVP = computeTimeWeightedBalance(
      delegateEvents,
      monthStart,
      monthEnd,
      initialVP,
    );

    const votesForDelegate = votes.filter(
      (v) => v.voterAccountId === delegateId,
    );
    delegateScores.push({
      delegateId,
      averageVotingPower: avgVP,
      proposalsVoted: new Set(votesForDelegate.map((v) => v.proposalId)).size,
      isActive: true,
    });
  }

  // Step 6: Compute delegate rewards
  const delegateResults = computeDelegateRewards(
    delegateScores,
    monthlyPool as bigint,
    poolTier.delegateCap as bigint,
  );

  // Step 7: Fetch active delegations at month-end
  const delegations = await dataSource.delegations.getActiveDelegations(
    activeDelegateArray,
    monthEnd,
  );

  // Step 8: Fetch protocol mappings and wallet aliases
  const protocolMappings = await dataSource.protocolMappings.getMappings();
  const walletAliases = await dataSource.walletAliases.getAliases();

  const rawDelegatorScores: DelegatorScore[] = [];
  const delegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];

  // Step 9: Compute 180-day TWB for each eligible delegator
  for (const delegatorId of delegatorIds) {
    const balanceEvents = await dataSource.balances.getBalanceHistory(
      [delegatorId],
      twbWindowStart,
      monthEnd,
    );
    const initialBalance = await dataSource.balances.getBalanceAt(
      delegatorId,
      twbWindowStart,
    );

    const twb = computeTimeWeightedBalance(
      balanceEvents,
      twbWindowStart,
      monthEnd,
      initialBalance,
    );

    const delegation = delegations.find(
      (d) => d.delegatorId === delegatorId,
    )!;

    rawDelegatorScores.push({
      delegatorId,
      delegateId: delegation.delegateId,
      timeWeightedBalance: twb,
    });
  }

  // Step 10: Consolidate wallets BEFORE cap calculation
  // Protocol mappings (proxy/contract → owner) + known wallet aliases (secondary → primary)
  // Combined TWBs ensure caps apply to the entity, not individual wallets
  const dedupedScores = consolidateDelegators(
    rawDelegatorScores,
    protocolMappings,
    walletAliases,
  );

  // Step 10: Compute delegator rewards
  const delegatorResults = computeDelegatorRewards(
    dedupedScores,
    monthlyPool as bigint,
    poolTier.delegatorCap as bigint,
  );

  // Combine into RewardAllocations
  const allAllocations: RewardAllocation[] = [
    ...delegateResults.map((r) => ({
      address: r.id,
      amount: r.amount,
      role: "delegate" as const,
    })),
    ...delegatorResults.map((r) => ({
      address: r.id,
      amount: r.amount,
      role: "delegator" as const,
    })),
  ];

  // Step 11: Apply lottery
  const randaoDate = `${year}-${String(monthNum).padStart(2, "0")}-${new Date(
    Number(monthEnd) * 1000,
  )
    .getUTCDate()
    .toString()
    .padStart(2, "0")}`;
  const randaoSeed = await dataSource.blocks.getRandaoForDate(randaoDate);

  const { directPayouts, lotteryPools } = runLottery(
    allAllocations,
    MIN_PAYOUT_THRESHOLD as bigint,
    LOTTERY_TARGET_POOL_SIZE as bigint,
    randaoSeed,
  );

  // Step 12: Post-computation validation
  const totalDirect = sum(directPayouts.map((p) => p.amount as bigint));
  const totalLottery = sum(lotteryPools.map((p) => p.totalPrize as bigint));
  const totalDistributed = totalDirect + totalLottery;

  // Total distributed should not exceed monthly pool
  invariant(
    totalDistributed <= (monthlyPool as bigint),
    `Total distributed (${totalDistributed}) exceeds monthly pool (${monthlyPool})`,
  );

  // No delegate exceeds delegate cap
  for (const payout of directPayouts.filter((p) => p.role === "delegate")) {
    invariant(
      (payout.amount as bigint) <= (poolTier.delegateCap as bigint),
      `Delegate ${payout.address} exceeds cap: ${payout.amount} > ${poolTier.delegateCap}`,
    );
  }

  // No delegator exceeds delegator cap
  for (const payout of directPayouts.filter((p) => p.role === "delegator")) {
    invariant(
      (payout.amount as bigint) <= (poolTier.delegatorCap as bigint),
      `Delegator ${payout.address} exceeds cap: ${payout.amount} > ${poolTier.delegatorCap}`,
    );
  }

  // Each lottery pool has exactly one winner who is a member
  for (const pool of lotteryPools) {
    invariant(
      pool.entries.some((e) => e.address === pool.winner),
      `Lottery winner ${pool.winner} not found in pool entries`,
    );
  }

  return {
    month,
    directPayouts,
    lotteryPools,
    metadata: {
      totalDistributed: wei(totalDistributed),
      poolTier,
      momGrowthBps: basisPoints(momGrowthBps),
      activeDelegateCount: activeDelegateIds.size,
      eligibleDelegatorCount: dedupedScores.length,
      computedAt: new Date().toISOString(),
      randaoSeed,
    },
  };
}

function emptyResult(month: string, _monthEnd: Seconds): DistributionResult {
  return {
    month,
    directPayouts: [],
    lotteryPools: [],
    metadata: {
      totalDistributed: wei(0n),
      poolTier: POOL_TIERS[0],
      momGrowthBps: basisPoints(0n),
      activeDelegateCount: 0,
      eligibleDelegatorCount: 0,
      computedAt: new Date().toISOString(),
      randaoSeed: 0n,
    },
  };
}
