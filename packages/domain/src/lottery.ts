import {
  type RewardAllocation,
  type LotteryEntry,
  type LotteryPool,
  wei,
} from "./types.js";
import { sum } from "./util/bigint-math.js";
import { keccak256, encodePacked } from "viem";

/**
 * Run the deterministic lottery for sub-threshold payouts.
 *
 * - Payouts below minThreshold are grouped into pools approaching targetPoolSize
 * - Each pool has a single winner selected by weighted random draw
 * - Randomness is deterministic: keccak256(randaoSeed, poolIndex)
 */
export function runLottery(
  allocations: RewardAllocation[],
  minThreshold: bigint,
  targetPoolSize: bigint,
  randaoSeed: bigint,
): { directPayouts: RewardAllocation[]; lotteryPools: LotteryPool[] } {
  const directPayouts: RewardAllocation[] = [];
  const lotteryEntries: LotteryEntry[] = [];

  for (const alloc of allocations) {
    if (alloc.amount >= minThreshold) {
      directPayouts.push(alloc);
    } else if (alloc.amount > 0n) {
      lotteryEntries.push({
        address: alloc.address,
        originalAmount: alloc.amount,
        role: alloc.role,
      });
    }
  }

  if (lotteryEntries.length === 0) {
    return { directPayouts, lotteryPools: [] };
  }

  // Sort entries by amount descending, then address for determinism
  lotteryEntries.sort((a, b) => {
    const diff = b.originalAmount - a.originalAmount;
    if (diff !== 0n) return diff > 0n ? 1 : -1;
    return a.address.localeCompare(b.address);
  });

  // Group into pools approaching targetPoolSize
  const pools: LotteryEntry[][] = [];
  let currentPool: LotteryEntry[] = [];
  let currentSum = 0n;

  for (const entry of lotteryEntries) {
    const entryAmount = entry.originalAmount;
    if (
      currentPool.length > 0 &&
      currentSum + entryAmount > targetPoolSize
    ) {
      pools.push(currentPool);
      currentPool = [entry];
      currentSum = entryAmount;
    } else {
      currentPool.push(entry);
      currentSum += entryAmount;
    }
  }
  if (currentPool.length > 0) {
    pools.push(currentPool);
  }

  // A single-entry pool has no randomness — promote to direct payout.
  const soloEntries: LotteryEntry[] = [];
  const multiEntryPools: LotteryEntry[][] = [];
  for (const pool of pools) {
    if (pool.length === 1) {
      soloEntries.push(pool[0]);
    } else {
      multiEntryPools.push(pool);
    }
  }

  for (const entry of soloEntries) {
    directPayouts.push({
      address: entry.address,
      amount: entry.originalAmount,
      role: entry.role,
    });
  }

  // For each multi-entry pool, draw a weighted random winner
  const lotteryPools: LotteryPool[] = multiEntryPools.map((entries, poolIndex) => {
    const totalPrize = wei(
      sum(entries.map((e) => e.originalAmount)),
    );
    const winner = drawWeightedWinner(entries, randaoSeed, poolIndex);
    return { entries, totalPrize, winner };
  });

  return { directPayouts, lotteryPools };
}

/**
 * Select a weighted random winner from pool entries.
 * Uses keccak256(randaoSeed, poolIndex) as deterministic randomness.
 */
function drawWeightedWinner(
  entries: LotteryEntry[],
  randaoSeed: bigint,
  poolIndex: number,
): string {
  if (entries.length === 1) return entries[0].address;

  const totalWeight = sum(entries.map((e) => e.originalAmount));
  if (totalWeight === 0n) return entries[0].address;

  // Generate deterministic random number
  const hash = keccak256(
    encodePacked(
      ["uint256", "uint256"],
      [randaoSeed, BigInt(poolIndex)],
    ),
  );
  const randomValue = BigInt(hash) % totalWeight;

  // Weighted selection via cumulative sum
  let cumulative = 0n;
  for (const entry of entries) {
    cumulative += entry.originalAmount;
    if (randomValue < cumulative) {
      return entry.address;
    }
  }

  // Fallback (should never reach due to modulo)
  return entries[entries.length - 1].address;
}
