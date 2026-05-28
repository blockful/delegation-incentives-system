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
import { TWB_WINDOW_SECONDS, PROPOSAL_WINDOW_SIZE } from "./config.js";
import { monthStartTimestamp, monthEndTimestamp } from "./util/time.js";
import { identifyActiveVoters } from "./active-voters.js";
import { computeVpGrowthPct, selectPoolTier } from "./pool-sizing.js";
import { computeTimeWeightedBalance } from "./time-weighted-balance.js";
import { computeTWAP } from "./twap-voting-power.js";
import { computeVoterRewards } from "./voter-rewards.js";
import { computeTokenHolderRewards } from "./token-holder-rewards.js";
import {
  resolveEligibleTokenHolders,
  consolidateTokenHolders,
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
  const prevMonthEnd = seconds(monthStart - 1n);
  const startBlock = await dataSource.getBlockForTimestamp(monthStart);
  const endBlock = await dataSource.getBlockForTimestamp(monthEnd);

  // ── Step 2: Get finalized proposals ──────────────────────
  const proposalsAtStart = await dataSource.getFinalizedProposals(
    monthStart,
    PROPOSAL_WINDOW_SIZE,
    startBlock,
  );
  const proposalsAtEnd = await dataSource.getFinalizedProposals(
    monthEnd,
    PROPOSAL_WINDOW_SIZE,
    endBlock,
  );

  // ── Step 3: Determine active voters ──────────────────────
  const votesAtStart = await dataSource.getVotesForProposals(
    proposalsAtStart.map((p) => p.id),
  );
  const activeVotersStart = identifyActiveVoters(
    proposalsAtStart,
    votesAtStart,
  );

  const votesAtEnd = await dataSource.getVotesForProposals(
    proposalsAtEnd.map((p) => p.id),
  );
  const activeVotersEnd = identifyActiveVoters(
    proposalsAtEnd,
    votesAtEnd,
  );

  // Early exit: no active voters at end of month
  if (activeVotersEnd.size === 0) {
    return emptyResult(month, monthStart, monthEnd, startBlock, endBlock);
  }

  // ── Step 4: Compute VP growth ────────────────────────────
  const vpStart = await dataSource.getAggregateVpAtTimestamp(
    [...activeVotersStart],
    prevMonthEnd,
  );
  const vpEnd = await dataSource.getAggregateVpAtTimestamp(
    [...activeVotersEnd],
    monthEnd,
  );
  const growthPct = computeVpGrowthPct(vpStart, vpEnd);

  // ── Step 5: Select pool tier ─────────────────────────────
  const tier = selectPoolTier(growthPct);

  // ── Step 6: Compute AVP (TWAP VP) for each active voter ──
  const voterAVPs = new Map<Address, Wei>();
  for (const voter of activeVotersEnd) {
    const vpEvents = await dataSource.getVpEventsInRange(
      voter,
      monthStart,
      monthEnd,
    );
    const initialVp = await dataSource.getVpAtTimestamp(voter, monthStart);
    const avp = computeTWAP(vpEvents, monthStart, monthEnd, initialVp);
    voterAVPs.set(voter, avp);
  }

  // ── Step 7: Allocate voter rewards ───────────────────────
  const voterRewards = computeVoterRewards(voterAVPs, tier.poolSize);

  // ── Step 8: Identify eligible token holders ──────────────
  const activeVotersList = [...activeVotersEnd];
  const directDelegations = await dataSource.getDelegationsToAtTimestamp(
    activeVotersList,
    monthEnd,
  );
  const multiDelegatePositions = await dataSource.getPositionsAtTimestamp(
    activeVotersList,
    monthEnd,
  );

  // Hedgey: find which vesting contracts are delegating to active voters
  const vestingContractAddresses = await dataSource.getVestingContractAddresses();
  const vestingContractSet = new Set(vestingContractAddresses);

  // Cross-reference: which token holders in directDelegations are vesting contracts
  const matchingContracts = new Set<Address>();
  for (const d of directDelegations) {
    if (vestingContractSet.has(d.tokenHolder)) {
      matchingContracts.add(d.tokenHolder);
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

  const eligible = resolveEligibleTokenHolders(
    directDelegations,
    multiDelegatePositions,
    vestingContractSet,
    nftOwnerMap,
    activeVotersEnd,
  );

  // ── Step 9: Consolidate ──────────────────────────────────
  const aliases = await dataSource.getAliases();
  const consolidated = consolidateTokenHolders(eligible, aliases);

  // ── Step 10: Compute TWB per token holder ────────────────
  const twbWindowStart = seconds(
    (monthEnd as bigint) - (TWB_WINDOW_SECONDS as bigint),
  );
  const tokenHolderTWBs = new Map<Address, Wei>();

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
              entry.voterAddress,
              twbWindowStart,
              monthEnd,
            );
          const initialErc1155Balance =
            await dataSource.getErc1155BalanceAtTimestamp(
              entry.originalAddress,
              entry.voterAddress,
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
              `Missing vestingPlanId for Hedgey token holder ${entry.resolvedAddress}`,
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
      tokenHolderTWBs.set(group.resolvedAddress, wei(totalTwb));
    }
  }

  // ── Step 11: Allocate token-holder rewards ───────────────
  const tokenHolderRewards = computeTokenHolderRewards(
    tokenHolderTWBs,
    tier.poolSize,
  );

  // ── Step 12: Combine rewards ─────────────────────────────
  const combined = combineRewards(
    voterRewards,
    tokenHolderRewards,
    tokenHolderTWBs,
  );

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
    voterCap: tier.voterCap,
    tokenHolderCap: tier.tokenHolderCap,
    activeVoterCount: activeVotersEnd.size,
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
  EligibleTokenHolder,
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
      voterCap: wei(0n),
      tokenHolderCap: wei(0n),
      activeVoterCount: 0,
      finalizedProposalIds: [],
    },
    rewards: [],
    lottery: { buckets: [] },
    deduplication: { multiDelegate: [], hedgey: [], walletAliases: [] },
  };
}

function buildDeduplicationLog(
  eligible: readonly EligibleTokenHolder[],
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
      voter: e.voterAddress,
      amount: wei(0n),
    }));

  // Hedgey entries: map vesting contract -> NFT owner + planId
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
  const voterCap = result.metadata.voterCap as bigint;
  const tokenHolderCap = result.metadata.tokenHolderCap as bigint;

  for (const reward of result.rewards) {
    const voterReward = reward.voterReward as bigint;
    const tokenHolderReward = reward.tokenHolderReward as bigint;
    const total = reward.total as bigint;

    if (voterReward > voterCap) {
      throw new Error(`Voter reward exceeds cap for ${reward.address}`);
    }
    if (tokenHolderReward > tokenHolderCap) {
      throw new Error(`Token-holder reward exceeds cap for ${reward.address}`);
    }
    if (voterReward + tokenHolderReward !== total) {
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
