import type { IncentivesDataSource } from "./interfaces.js";
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
} from "./types.js";
import { identifyActiveDelegates } from "./active-delegates.js";
import { determinePoolTier } from "./pool-sizing.js";
import { computeTimeWeightedBalance } from "./time-weighted-balance.js";
import { computeDelegateRewards } from "./delegate-rewards.js";
import { computeDelegatorRewards } from "./delegator-rewards.js";
import { runLottery } from "./lottery.js";
import { consolidateDelegators } from "./protocol-dedup.js";
import { POOL_TIERS, MIN_PAYOUT_THRESHOLD, LOTTERY_TARGET_POOL_SIZE } from "./config.js";
import { sum, percentageGrowthBps } from "./util/bigint-math.js";
import {
  parseMonth,
  monthStartTimestamp,
  monthEndTimestamp,
  previousMonth,
} from "./util/time.js";
import { invariant } from "./util/invariant.js";

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
  const twbWindowStart = seconds(monthEnd - TWB_WINDOW_SECONDS);

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

  // Step 4: Compute MoM VP growth and determine pool tier.
  // Use point-in-time VP snapshots at each month boundary (not TWAP — TWAP is only for reward shares).
  const currentAVP = await dataSource.votingPower.getAggregateVotingPowerAt(
    activeDelegateArray,
    monthEnd,
  );
  const previousAVP = await dataSource.votingPower.getAggregateVotingPowerAt(
    activeDelegateArray,
    prevMonthEnd,
  );

  // Bootstrap guard: if there is no prior VP history (first program month),
  // previousAVP is 0 and growth would compute as 100% → forcing the top tier.
  // Default to tier 0 (lowest) so the first distribution is conservative.
  const momGrowthBps =
    previousAVP === 0n ? basisPoints(0n) : basisPoints(percentageGrowthBps(currentAVP, previousAVP));
  const poolTier =
    previousAVP === 0n ? POOL_TIERS[0] : determinePoolTier(currentAVP, previousAVP, POOL_TIERS);
  const monthlyPool = poolTier.poolSize;

  // Step 5: Compute average voting power for each active delegate.
  // Fetch both the within-month history and the pre-month history in parallel,
  // then compute per-delegate TWAP in memory without further round-trips.
  const [vpHistory, preMonthVPHistory] = await Promise.all([
    dataSource.votingPower.getVotingPowerHistory(activeDelegateArray, monthStart, monthEnd),
    dataSource.votingPower.getVotingPowerHistory(activeDelegateArray, seconds(0n), monthStart),
  ]);

  // Group pre-month snapshots by delegate for O(1) initial-VP lookup
  const preMonthByDelegate = new Map<string, typeof preMonthVPHistory[number]>();
  for (const s of preMonthVPHistory) {
    const existing = preMonthByDelegate.get(s.accountId);
    if (!existing || s.timestamp > existing.timestamp) {
      preMonthByDelegate.set(s.accountId, s);
    }
  }

  // Build vote lookup: voterAccountId → Set<proposalId>
  const votesByDelegate = new Map<string, Set<string>>();
  for (const v of votes) {
    const set = votesByDelegate.get(v.voterAccountId) ?? new Set<string>();
    set.add(v.proposalId);
    votesByDelegate.set(v.voterAccountId, set);
  }

  const delegateScores: DelegateScore[] = activeDelegateArray.map((delegateId) => {
    const delegateEvents = vpHistory
      .filter((s) => s.accountId === delegateId)
      .map((s) => ({ accountId: s.accountId, balance: s.votingPower, delta: s.delta, timestamp: s.timestamp }));

    const initialVP = preMonthByDelegate.get(delegateId)?.votingPower ?? wei(0n);
    const avgVP = computeTimeWeightedBalance(delegateEvents, monthStart, monthEnd, initialVP);

    return {
      delegateId,
      averageVotingPower: avgVP,
      proposalsVoted: votesByDelegate.get(delegateId)?.size ?? 0,
      isActive: true,
    };
  });

  // Step 6: Compute delegate rewards
  const delegateResults = computeDelegateRewards(
    delegateScores,
    monthlyPool,
    poolTier.delegateCap,
  );

  // Step 7: Fetch active delegations at month-end
  const delegations = await dataSource.delegations.getActiveDelegations(
    activeDelegateArray,
    monthEnd,
  );

  // Step 8: Fetch protocol mappings and wallet aliases
  const protocolMappings = await dataSource.protocolMappings.getMappings();
  const walletAliases = await dataSource.walletAliases.getAliases();

  const delegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];

  // Step 9: Compute 180-day TWB for each eligible delegator.
  // Fetch all balance history in one batch query, initial balances in parallel.
  const [allBalanceEvents, initialBalances] = await Promise.all([
    dataSource.balances.getBalanceHistory(delegatorIds, twbWindowStart, monthEnd),
    Promise.all(delegatorIds.map((id) => dataSource.balances.getBalanceAt(id, twbWindowStart))),
  ]);

  const delegationByDelegator = new Map(delegations.map((d) => [d.delegatorId, d]));

  const rawDelegatorScores: DelegatorScore[] = [];
  for (let i = 0; i < delegatorIds.length; i++) {
    const delegatorId = delegatorIds[i];
    const delegation = delegationByDelegator.get(delegatorId);
    if (!delegation) continue;

    const events = allBalanceEvents.filter((e) => e.accountId === delegatorId);
    const twb = computeTimeWeightedBalance(events, twbWindowStart, monthEnd, initialBalances[i]);
    rawDelegatorScores.push({ delegatorId, delegateId: delegation.delegateId, timeWeightedBalance: twb });
  }

  // Step 10: Consolidate wallets BEFORE cap calculation
  // Protocol mappings (proxy/contract → owner) + known wallet aliases (secondary → primary)
  // Combined TWBs ensure caps apply to the entity, not individual wallets
  const dedupedScores = consolidateDelegators(
    rawDelegatorScores,
    protocolMappings,
    walletAliases,
  );

  // Step 11: Compute delegator rewards
  const delegatorResults = computeDelegatorRewards(
    dedupedScores,
    monthlyPool,
    poolTier.delegatorCap,
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

  // Step 12: Apply lottery
  const randaoDate = `${year}-${String(monthNum).padStart(2, "0")}-${new Date(
    Number(monthEnd) * 1000,
  )
    .getUTCDate()
    .toString()
    .padStart(2, "0")}`;
  const randaoSeed = await dataSource.blocks.getRandaoForDate(randaoDate);

  const { directPayouts, lotteryPools } = runLottery(
    allAllocations,
    MIN_PAYOUT_THRESHOLD,
    LOTTERY_TARGET_POOL_SIZE,
    randaoSeed,
  );

  // Step 13: Post-computation validation
  const totalDirect = sum(directPayouts.map((p) => p.amount));
  const totalLottery = sum(lotteryPools.map((p) => p.totalPrize));
  const totalDistributed = totalDirect + totalLottery;

  // Total distributed should not exceed monthly pool
  invariant(
    totalDistributed <= monthlyPool,
    `Total distributed (${totalDistributed}) exceeds monthly pool (${monthlyPool})`,
  );

  // No delegate exceeds delegate cap
  for (const payout of directPayouts.filter((p) => p.role === "delegate")) {
    invariant(
      payout.amount <= poolTier.delegateCap,
      `Delegate ${payout.address} exceeds cap: ${payout.amount} > ${poolTier.delegateCap}`,
    );
  }

  // No delegator exceeds delegator cap
  for (const payout of directPayouts.filter((p) => p.role === "delegator")) {
    invariant(
      payout.amount <= poolTier.delegatorCap,
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
      momGrowthBps,
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
