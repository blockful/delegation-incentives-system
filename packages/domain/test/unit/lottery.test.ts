import { describe, it, expect } from "vitest";
import { formBuckets, runLottery } from "../../src/lottery.js";
import type { Address, Wei } from "../../src/types.js";
import { wei } from "../../src/types.js";
import { LOTTERY_BUCKET_TARGET } from "../../src/config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENS = 10n ** 18n;

function entry(label: string, ens: bigint): { address: Address; amount: Wei } {
  // Generate deterministic address from label
  const hex = label.padStart(40, "0");
  return {
    address: `0x${hex}` as Address,
    amount: wei(ens * ENS),
  };
}

// A deterministic fake RANDAO value (32 bytes)
const RANDAO =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

// ---------------------------------------------------------------------------
// formBuckets
// ---------------------------------------------------------------------------

describe("formBuckets", () => {
  it("sorts entries descending by amount", () => {
    const entries = [entry("a", 2n), entry("b", 5n), entry("c", 1n)];
    const buckets = formBuckets(entries);

    // All in one bucket (total 8 ENS < 10 ENS target)
    expect(buckets).toHaveLength(1);
    expect(buckets[0][0].amount).toBe(wei(5n * ENS)); // largest first
    expect(buckets[0][1].amount).toBe(wei(2n * ENS));
    expect(buckets[0][2].amount).toBe(wei(1n * ENS));
  });

  it("entry that pushes bucket over target stays in current bucket", () => {
    // 7 ENS + 5 ENS = 12 ENS >= 10 ENS → first bucket closes
    // 3 ENS remains in second bucket
    const entries = [entry("a", 7n), entry("b", 5n), entry("c", 3n)];
    const buckets = formBuckets(entries);

    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveLength(2); // 7 + 5 = 12 ENS
    expect(buckets[1]).toHaveLength(1); // 3 ENS
  });

  it("last bucket can be smaller than target", () => {
    const entries = [
      entry("a", 6n),
      entry("b", 5n),
      entry("c", 4n),
      entry("d", 1n),
    ];
    const buckets = formBuckets(entries);

    // 6 + 5 = 11 >= 10 → first bucket
    // 4 + 1 = 5 < 10 → second bucket (smaller)
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveLength(2);
    expect(buckets[1]).toHaveLength(2);
  });

  it("single entry forms a solo bucket", () => {
    const entries = [entry("solo", 3n)];
    const buckets = formBuckets(entries);

    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toHaveLength(1);
  });

  it("empty entries returns empty array", () => {
    const buckets = formBuckets([]);
    expect(buckets).toEqual([]);
  });

  it("does not mutate input array", () => {
    const entries = [entry("a", 2n), entry("b", 5n), entry("c", 1n)];
    const original = [...entries];
    formBuckets(entries);
    expect(entries).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// runLottery
// ---------------------------------------------------------------------------

describe("runLottery", () => {
  it("single entry wins automatically (solo bucket)", () => {
    const entries = [entry("solo", 3n)];
    const result = runLottery(entries, RANDAO);

    expect(result).toHaveLength(1);
    expect(result[0].winner).toBe(entries[0].address);
    expect(result[0].entries).toHaveLength(1);
    expect(result[0].entries[0].probability).toBe("1.0000");
    expect(result[0].prize).toBe(wei(3n * ENS));
  });

  it("empty entries returns empty result", () => {
    const result = runLottery([], RANDAO);
    expect(result).toEqual([]);
  });

  it("deterministic: same randao + entries always produces same winner", () => {
    const entries = [
      entry("a1", 3n),
      entry("b2", 4n),
      entry("c3", 2n),
      entry("d4", 1n),
    ];

    const result1 = runLottery(entries, RANDAO);
    const result2 = runLottery(entries, RANDAO);

    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].winner).toBe(result2[i].winner);
      expect(result1[i].bucketIndex).toBe(result2[i].bucketIndex);
    }
  });

  it("different randao values can produce different winners", () => {
    // With enough entries in one bucket, different RANDAO should diverge
    const entries = [
      entry("a1", 1n),
      entry("b2", 1n),
      entry("c3", 1n),
      entry("d4", 1n),
      entry("e5", 1n),
      entry("f6", 1n),
      entry("g7", 1n),
      entry("h8", 1n),
      entry("i9", 1n),
      entry("j0", 1n),
    ];

    const randao2 =
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    const result1 = runLottery(entries, RANDAO);
    const result2 = runLottery(entries, randao2);

    // At least one bucket should have a different winner
    // (statistically extremely unlikely to match across all buckets)
    const winners1 = result1.map((b) => b.winner);
    const winners2 = result2.map((b) => b.winner);
    expect(winners1).not.toEqual(winners2);
  });

  it("winner probability sums to ~1 per bucket", () => {
    const entries = [
      entry("a1", 3n),
      entry("b2", 4n),
      entry("c3", 2n),
      entry("d4", 1n),
    ];

    const result = runLottery(entries, RANDAO);

    for (const bucket of result) {
      const totalProb = bucket.entries.reduce(
        (acc, e) => acc + parseFloat(e.probability),
        0,
      );
      // Should be very close to 1.0 (minor rounding from integer division)
      expect(totalProb).toBeGreaterThan(0.99);
      expect(totalProb).toBeLessThanOrEqual(1.0001);
    }
  });

  it("winner is always one of the entries in the bucket", () => {
    const entries = [
      entry("a1", 5n),
      entry("b2", 3n),
      entry("c3", 2n),
      entry("d4", 1n),
      entry("e5", 4n),
    ];

    const result = runLottery(entries, RANDAO);

    for (const bucket of result) {
      const bucketAddresses = bucket.entries.map((e) => e.address);
      expect(bucketAddresses).toContain(bucket.winner);
    }
  });

  it("probability is proportional to entry amount", () => {
    // Create entries that fit in one bucket (total 9 ENS < 10 target)
    const entries = [entry("big", 6n), entry("small", 3n)];

    const result = runLottery(entries, RANDAO);

    expect(result).toHaveLength(1);
    const bucket = result[0];

    // big has 6/9 ~= 0.6667, small has 3/9 ~= 0.3333
    const bigEntry = bucket.entries.find((e) => e.address === entries[0].address)!;
    const smallEntry = bucket.entries.find((e) => e.address === entries[1].address)!;

    expect(parseFloat(bigEntry.probability)).toBeCloseTo(0.6666, 3);
    expect(parseFloat(smallEntry.probability)).toBeCloseTo(0.3333, 3);
  });

  it("bucket prize equals sum of entry amounts", () => {
    const entries = [
      entry("a1", 3n),
      entry("b2", 4n),
      entry("c3", 2n),
    ];

    const result = runLottery(entries, RANDAO);

    for (const bucket of result) {
      const sum = bucket.entries.reduce(
        (acc, e) => acc + (e.amount as bigint),
        0n,
      );
      expect(bucket.prize).toBe(wei(sum));
    }
  });
});
