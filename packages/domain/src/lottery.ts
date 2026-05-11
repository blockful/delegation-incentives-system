import type { Address, Wei, LotteryBucket, LotteryEntry } from "./types.js";
import { wei } from "./types.js";
import { keccak256, encodePacked } from "viem";
import { LOTTERY_BUCKET_TARGET } from "./config.js";

// ──────────────────────────────────────────────────────────
// Step 14: Deterministic lottery
// ──────────────────────────────────────────────────────────

/**
 * Form buckets from sub-threshold entries.
 * Sort entries descending by amount. Fill buckets sequentially.
 * Entry that pushes bucket over target stays in current bucket.
 */
export function formBuckets(
  entries: readonly { address: Address; amount: Wei }[],
): { address: Address; amount: Wei }[][] {
  if (entries.length === 0) return [];

  // Sort descending by amount (do not mutate input)
  const sorted = [...entries].sort((a, b) => {
    if (a.amount > b.amount) return -1;
    if (a.amount < b.amount) return 1;
    return 0;
  });

  const buckets: { address: Address; amount: Wei }[][] = [];
  let currentBucket: { address: Address; amount: Wei }[] = [];
  let currentTotal = 0n;

  for (const entry of sorted) {
    currentBucket.push(entry);
    currentTotal += entry.amount;

    if (currentTotal >= (LOTTERY_BUCKET_TARGET as bigint)) {
      buckets.push(currentBucket);
      currentBucket = [];
      currentTotal = 0n;
    }
  }

  // Push remaining entries as the last (smaller) bucket
  if (currentBucket.length > 0) {
    buckets.push(currentBucket);
  }

  return buckets;
}

/**
 * Select a winner from a bucket using a deterministic hash.
 * Walk entries by cumulative sum: winner is the entry where cumSum > randomValue.
 */
function selectWinner(
  bucketEntries: readonly { address: Address; amount: Wei }[],
  randaoValue: string,
  bucketIndex: number,
): { winner: Address; bucketTotal: bigint } {
  const bucketTotal = bucketEntries.reduce(
    (acc, e) => acc + (e.amount as bigint),
    0n,
  );

  if (bucketEntries.length === 1 || bucketTotal === 0n) {
    return { winner: bucketEntries[0].address, bucketTotal };
  }

  const hash = keccak256(
    encodePacked(
      ["bytes32", "uint256"],
      [randaoValue as `0x${string}`, BigInt(bucketIndex)],
    ),
  );
  const randomValue = BigInt(hash) % bucketTotal;

  let cumSum = 0n;
  for (const entry of bucketEntries) {
    cumSum += entry.amount as bigint;
    if (cumSum > randomValue) {
      return { winner: entry.address, bucketTotal };
    }
  }

  // Fallback: last entry (should not happen with correct math)
  return {
    winner: bucketEntries[bucketEntries.length - 1].address,
    bucketTotal,
  };
}

/**
 * Run deterministic lottery.
 * For each bucket: winner selected via keccak256(randaoValue, bucketIndex).
 * Winner probability = entry.amount / bucket.total.
 * Solo buckets: entry wins automatically.
 */
export function runLottery(
  entries: readonly { address: Address; amount: Wei }[],
  randaoValue: string,
): LotteryBucket[] {
  if (entries.length === 0) return [];

  const buckets = formBuckets(entries);
  const results: LotteryBucket[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const bucketEntries = buckets[i];
    const { winner, bucketTotal } = selectWinner(
      bucketEntries,
      randaoValue,
      i,
    );

    const lotteryEntries: LotteryEntry[] = bucketEntries.map((e) => {
      const probabilityBps = bucketTotal === 0n ? 0n : (e.amount as bigint) * 10000n / bucketTotal;
      return {
        address: e.address,
        amount: e.amount,
        probability: formatProbability(probabilityBps),
      };
    });

    results.push({
      bucketIndex: i,
      entries: lotteryEntries,
      prize: wei(bucketTotal),
      winner,
    });
  }

  return results;
}

/**
 * Format probability from basis points (e.g. 5000 → "0.5000", 10000 → "1.0000").
 */
function formatProbability(bps: bigint): string {
  const intPart = bps / 10000n;
  const fracPart = bps % 10000n;
  return `${intPart}.${fracPart.toString().padStart(4, "0")}`;
}
