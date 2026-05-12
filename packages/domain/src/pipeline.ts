import type { IncentivesDataSource } from "./interfaces.js";
import type {
  DistributionResult,
  DistributionMetadata,
  DeduplicationLog,
  Address,
  Wei,
  Seconds,
  CombinedReward,
} from "./types.js";
import { wei, seconds } from "./types.js";
import { TWB_WINDOW_SECONDS, PROPOSAL_WINDOW } from "./config.js";
import { monthStartTimestamp, monthEndTimestamp } from "./util/time.js";
import { identifyActiveDelegates } from "./active-delegates.js";
import { computeVpGrowthPct, selectPoolTier } from "./pool-sizing.js";
import { computeTimeWeightedBalance } from "./time-weighted-balance.js";
import { computeTWAP } from "./twap-voting-power.js";
import { computeDelegateRewards } from "./delegate-rewards.js";
import { computeDelegatorRewards } from "./delegator-rewards.js";
import {
  resolveEligibleDelegators,
  consolidateDelegators,
} from "./consolidation.js";
import { combineRewards, applyMinimumThreshold } from "./combine-rewards.js";
import { runLottery } from "./lottery.js";

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export async function runDistributionPipeline(
  month: string,
  dataSource: IncentivesDataSource,
): Promise<DistributionResult> {
  // ── Step 1: Resolve round boundaries ─────────────────────
  const monthStart = seconds(monthStartTimestamp(month));
  const monthEnd = seconds(monthEndTimestamp(month));
  const startBlock = await dataSource.getBlockForTimestamp(monthStart);
  const endBlock = await dataSource.getBlockForTimestamp(monthEnd);

  // ── Step 2: Get finalized proposals ──────────────────────
  const proposalsAtStart = await dataSource.getFinalizedProposals(
    monthStart,
    PROPOSAL_WINDOW,
    startBlock,
  );
  const proposalsAtEnd = await dataSource.getFinalizedProposals(
    monthEnd,
    PROPOSAL_WINDOW,
    endBlock,
  );

  // ── Step 3: Determine active delegates ───────────────────
  const votesAtStart = await dataSource.getVotesForProposals(
    proposalsAtStart.map((p) => p.id),
  );
  const activeDelegatesStart = identifyActiveDelegates(
    proposalsAtStart,
    votesAtStart,
  );

  const votesAtEnd = await dataSource.getVotesForProposals(
    proposalsAtEnd.map((p) => p.id),
  );
  const activeDelegatesEnd = identifyActiveDelegates(
    proposalsAtEnd,
    votesAtEnd,
  );

  // Early exit: no active delegates at end of month
  if (activeDelegatesEnd.size === 0) {
    return emptyResult(month, monthStart, monthEnd, startBlock, endBlock);
  }

  // ── Step 4: Compute VP growth ────────────────────────────
  const vpStart = await dataSource.getAggregateVpAtTimestamp(
    [...activeDelegatesStart],
    monthStart,
  );
  const vpEnd = await dataSource.getAggregateVpAtTimestamp(
    [...activeDelegatesEnd],
    monthEnd,
  );
  const growthPct = computeVpGrowthPct(vpStart, vpEnd);

  // ── Step 5: Select pool tier ─────────────────────────────
  const tier = selectPoolTier(growthPct);

  // ── Step 6: Compute TWAP VP for each active delegate ─────
  const delegateTWAPs = new Map<Address, Wei>();
  for (const delegate of activeDelegatesEnd) {
    const vpEvents = await dataSource.getVpEventsInRange(
      delegate,
      monthStart,
      monthEnd,
    );
    const initialVp = await dataSource.getVpAtTimestamp(delegate, monthStart);
    const twap = computeTWAP(vpEvents, monthStart, monthEnd, initialVp);
    delegateTWAPs.set(delegate, twap);
  }

  // ── Step 7: Allocate delegate rewards ────────────────────
  const delegateRewards = computeDelegateRewards(delegateTWAPs, tier.poolSize);

  // ── Step 8: Identify eligible delegators ─────────────────
  const activeDelegatesList = [...activeDelegatesEnd];
  const directDelegations = await dataSource.getDelegationsToAtTimestamp(
    activeDelegatesList,
    monthEnd,
  );
  const multiDelegatePositions = await dataSource.getPositionsAtTimestamp(
    activeDelegatesList,
    monthEnd,
  );

  // Hedgey: find which vesting contracts are delegating to active delegates
  const vestingContractAddresses = await dataSource.getVestingContractAddresses();
  const vestingContractSet = new Set(vestingContractAddresses);

  // Cross-reference: which delegators in directDelegations are vesting contracts
  const matchingContracts = new Set<Address>();
  for (const d of directDelegations) {
    if (vestingContractSet.has(d.delegator)) {
      matchingContracts.add(d.delegator);
    }
  }

  // Get plans for matching vesting contracts — collect all owners per contract
  const nftOwnerMap = new Map<
    Address,
    { planId: string; owner: Address }[]
  >();
  if (matchingContracts.size > 0) {
    const vestingPlans = await dataSource.getPlansForContracts([
      ...matchingContracts,
    ], monthEnd);
    for (const plan of vestingPlans) {
      const owner = await dataSource.getNftOwnerAtTimestamp(
        plan.planId,
        monthEnd,
      );
      if (owner === ZERO_ADDRESS) continue;
      const owners = nftOwnerMap.get(plan.contractAddress) ?? [];
      owners.push({ planId: plan.planId, owner });
      nftOwnerMap.set(plan.contractAddress, owners);
    }
  }

  const eligible = resolveEligibleDelegators(
    directDelegations,
    multiDelegatePositions,
    vestingContractSet,
    nftOwnerMap,
    activeDelegatesEnd,
  );

  // ── Step 9: Consolidate ──────────────────────────────────
  const aliases = await dataSource.getAliases();
  const consolidated = consolidateDelegators(eligible, aliases);

  // ── Step 10: Compute TWB per delegator ───────────────────
  const twbWindowStart = seconds(
    (monthEnd as bigint) - (TWB_WINDOW_SECONDS as bigint),
  );
  const delegatorTWBs = new Map<Address, Wei>();

  for (const group of consolidated) {
    let totalTwb = 0n;

    for (const entry of group.entries) {
      let twb: Wei;

      switch (entry.source) {
        case "direct": {
          const balanceEvents = await dataSource.getBalanceEventsInRange(
            entry.originalAddress,
            twbWindowStart,
            monthEnd,
          );
          const initialBalance = await dataSource.getBalanceAtTimestamp(
            entry.originalAddress,
            twbWindowStart,
          );
          twb = computeTimeWeightedBalance(
            balanceEvents.map((e) => ({
              balance: e.balance,
              timestamp: e.timestamp,
            })),
            twbWindowStart,
            monthEnd,
            initialBalance,
          );
          break;
        }
        case "multidelegate": {
          const erc1155Events =
            await dataSource.getErc1155BalanceEventsInRange(
              entry.originalAddress,
              entry.delegateAddress,
              twbWindowStart,
              monthEnd,
            );
          const initialErc1155Balance =
            await dataSource.getErc1155BalanceAtTimestamp(
              entry.originalAddress,
              entry.delegateAddress,
              twbWindowStart,
            );
          twb = computeTimeWeightedBalance(
            erc1155Events.map((e) => ({
              balance: e.balance,
              timestamp: e.timestamp,
            })),
            twbWindowStart,
            monthEnd,
            initialErc1155Balance,
          );
          break;
        }
        case "hedgey": {
          if (entry.vestingPlanId === undefined) {
            throw new Error(
              `Missing vestingPlanId for Hedgey delegator ${entry.resolvedAddress}`,
            );
          }

          const vestingBalanceEvents =
            await dataSource.getPlanBalanceEventsInRange(
              entry.vestingPlanId,
              twbWindowStart,
              monthEnd,
            );
          const vestingInitialBalance =
            await dataSource.getPlanBalanceAtTimestamp(
              entry.vestingPlanId,
              twbWindowStart,
            );
          twb = computeTimeWeightedBalance(
            vestingBalanceEvents.map((e) => ({
              balance: e.balance,
              timestamp: e.timestamp,
            })),
            twbWindowStart,
            monthEnd,
            vestingInitialBalance,
          );
          break;
        }
      }

      totalTwb += twb as bigint;
    }

    if (totalTwb > 0n) {
      delegatorTWBs.set(group.resolvedAddress, wei(totalTwb));
    }
  }

  // ── Step 11: Allocate delegator rewards ──────────────────
  const delegatorRewards = computeDelegatorRewards(
    delegatorTWBs,
    tier.poolSize,
  );

  // ── Step 12: Combine rewards ─────────────────────────────
  const combined = combineRewards(delegateRewards, delegatorRewards);

  // ── Step 13: Apply threshold ─────────────────────────────
  const { directPayouts, lotteryEntries } = applyMinimumThreshold(combined);

  // ── Step 14: Lottery ─────────────────────────────────────
  const randaoValue = await dataSource.getRandaoValue(endBlock);
  const lotteryBuckets = runLottery(lotteryEntries, randaoValue);

  // ── Step 15: Build DistributionResult ────────────────────
  const metadata: DistributionMetadata = {
    month,
    monthStart,
    monthEnd,
    startBlock,
    endBlock,
    randaoValue,
    vpStart,
    vpEnd,
    vpGrowthPct: growthPct.toFixed(2),
    tier: POOL_TIERS_INDEX(tier),
    poolSize: tier.poolSize,
    delegateCap: tier.delegateCap,
    delegatorCap: tier.delegatorCap,
    activeDelegateCount: activeDelegatesEnd.size,
    finalizedProposalIds: proposalsAtEnd.map((p) => p.id),
  };

  // Build deduplication log
  const deduplication = buildDeduplicationLog(eligible, aliases, nftOwnerMap);

  // Mark payout type on rewards: directPayouts get listed as-is,
  // lottery winners are also included from the buckets.
  const rewards: CombinedReward[] = directPayouts;

  const result: DistributionResult = {
    metadata,
    rewards,
    lottery: { buckets: lotteryBuckets },
    deduplication,
  };

  validateDistributionResult(result);

  return result;
}

// ── Helpers ───────────────────────────────────────────────────

import { POOL_TIERS } from "./config.js";
import type {
  BlockNumber,
  EligibleDelegator,
  WalletAlias,
} from "./types.js";

function POOL_TIERS_INDEX(tier: ReturnType<typeof selectPoolTier>): number {
  const idx = POOL_TIERS.indexOf(tier);
  return idx >= 0 ? idx : 0;
}

function emptyResult(
  month: string,
  monthStart: Seconds,
  monthEnd: Seconds,
  startBlock: BlockNumber,
  endBlock: BlockNumber,
): DistributionResult {
  return {
    metadata: {
      month,
      monthStart,
      monthEnd,
      startBlock,
      endBlock,
      randaoValue: "0x0",
      vpStart: wei(0n),
      vpEnd: wei(0n),
      vpGrowthPct: "0.00",
      tier: 0,
      poolSize: wei(0n),
      delegateCap: wei(0n),
      delegatorCap: wei(0n),
      activeDelegateCount: 0,
      finalizedProposalIds: [],
    },
    rewards: [],
    lottery: { buckets: [] },
    deduplication: { multiDelegate: [], hedgey: [], walletAliases: [] },
  };
}

function buildDeduplicationLog(
  eligible: readonly EligibleDelegator[],
  aliases: readonly WalletAlias[],
  _nftOwnerMap: ReadonlyMap<
    Address,
    readonly { planId: string; owner: Address }[]
  >,
): DeduplicationLog {
  // MultiDelegate entries
  const multiDelegate = eligible
    .filter((e) => e.source === "multidelegate")
    .map((e) => ({
      erc1155Holder: e.originalAddress,
      delegate: e.delegateAddress,
      amount: wei(0n), // position balance not tracked in EligibleDelegator; logged for dedup tracking
    }));

  // Hedgey entries: map vesting contract -> NFT owner + planId
  // We reconstruct from the eligible list and nftOwnerMap
  const hedgeyEntries = eligible.filter((e) => e.source === "hedgey");
  const hedgey = hedgeyEntries.map((e) => ({
    vestingContract: e.originalAddress,
    nftOwner: e.resolvedAddress,
    planId: e.vestingPlanId ?? "",
  }));

  // Wallet aliases that were used
  const walletAliases = aliases.map((a) => ({
    secondary: a.secondary,
    primary: a.primary,
  }));

  return { multiDelegate, hedgey, walletAliases };
}

export function validateDistributionResult(result: DistributionResult): void {
  let totalDistributed = 0n;
  const poolSize = result.metadata.poolSize as bigint;
  const delegateCap = result.metadata.delegateCap as bigint;
  const delegatorCap = result.metadata.delegatorCap as bigint;

  for (const reward of result.rewards) {
    const delegateReward = reward.delegateReward as bigint;
    const delegatorReward = reward.delegatorReward as bigint;
    const total = reward.total as bigint;

    if (delegateReward > delegateCap) {
      throw new Error(`Delegate reward exceeds cap for ${reward.address}`);
    }
    if (delegatorReward > delegatorCap) {
      throw new Error(`Delegator reward exceeds cap for ${reward.address}`);
    }
    if (delegateReward + delegatorReward !== total) {
      throw new Error(`Combined reward total mismatch for ${reward.address}`);
    }

    totalDistributed += total;
  }

  for (const bucket of result.lottery.buckets) {
    totalDistributed += bucket.prize as bigint;

    const winner = bucket.winner.toLowerCase();
    const hasWinner = bucket.entries.some(
      (entry) => entry.address.toLowerCase() === winner,
    );
    if (!hasWinner) {
      throw new Error(`Lottery winner is not an entry in bucket ${bucket.bucketIndex}`);
    }

    const entryTotal = bucket.entries.reduce(
      (acc, entry) => acc + (entry.amount as bigint),
      0n,
    );
    if (entryTotal !== (bucket.prize as bigint)) {
      throw new Error(`Lottery prize mismatch in bucket ${bucket.bucketIndex}`);
    }
  }

  if (totalDistributed > poolSize) {
    throw new Error("Total distributed exceeds pool size");
  }
}
