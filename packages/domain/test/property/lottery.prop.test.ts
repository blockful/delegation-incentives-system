import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { runLottery } from "@/lottery.js";
import { type RewardAllocation, wei, ONE_ENS } from "@/types.js";

const MIN_THRESHOLD = ONE_ENS; // 1 ENS
const TARGET_POOL_SIZE = wei(10n * ONE_ENS);

// Arbitrary for an Ethereum-style address
const addressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((s) => "0x" + s);

// Arbitrary for a role
const roleArb = fc.constantFrom("delegate" as const, "delegator" as const);

// Arbitrary for amount: mix above and below threshold
const amountArb = fc.bigInt({ min: 0n, max: ONE_ENS * 100n });

// Arbitrary for a RewardAllocation
const allocationArb = fc
  .record({
    address: addressArb,
    amount: amountArb,
    role: roleArb,
  })
  .map(({ address, amount, role }) => ({
    address,
    amount: wei(amount),
    role,
  }) as RewardAllocation);

// Array of allocations with unique addresses
const allocationsArb = fc.uniqueArray(allocationArb, {
  minLength: 0,
  maxLength: 20,
  comparator: (a, b) => a.address === b.address,
});

// Arbitrary for randaoSeed
const randaoSeedArb = fc.bigInt({ min: 0n, max: 2n ** 256n - 1n });

describe("runLottery property tests", () => {
  it("conservation: sum(directPayouts) + sum(lotteryPools.totalPrize) == sum(positive inputs)", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const inputTotal = allocations
          .filter((a) => (a.amount as bigint) > 0n)
          .reduce((acc, a) => acc + (a.amount as bigint), 0n);

        const { directPayouts, lotteryPools } = runLottery(
          allocations,
          MIN_THRESHOLD,
          TARGET_POOL_SIZE,
          seed,
        );

        const directTotal = directPayouts.reduce(
          (acc, a) => acc + (a.amount as bigint),
          0n,
        );
        const poolTotal = lotteryPools.reduce(
          (acc, p) => acc + (p.totalPrize as bigint),
          0n,
        );

        expect(directTotal + poolTotal).toBe(inputTotal);
      }),
      { numRuns: 300 },
    );
  });

  it("above-threshold → direct: allocations with amount >= minThreshold appear in directPayouts", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const { directPayouts, lotteryPools } = runLottery(
          allocations,
          MIN_THRESHOLD,
          TARGET_POOL_SIZE,
          seed,
        );

        const aboveThreshold = allocations.filter(
          (a) => (a.amount as bigint) >= MIN_THRESHOLD,
        );

        const directAddresses = new Set(directPayouts.map((p) => p.address));
        const poolAddresses = new Set(
          lotteryPools.flatMap((p) => p.entries.map((e) => e.address)),
        );

        for (const alloc of aboveThreshold) {
          expect(directAddresses.has(alloc.address)).toBe(true);
          expect(poolAddresses.has(alloc.address)).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("zero-amount → excluded: allocations with amount == 0 appear in neither directPayouts nor lotteryPools", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const { directPayouts, lotteryPools } = runLottery(
          allocations,
          MIN_THRESHOLD,
          TARGET_POOL_SIZE,
          seed,
        );

        const zeroAddresses = new Set(
          allocations
            .filter((a) => (a.amount as bigint) === 0n)
            .map((a) => a.address),
        );

        const directAddresses = new Set(directPayouts.map((p) => p.address));
        const poolAddresses = new Set(
          lotteryPools.flatMap((p) => p.entries.map((e) => e.address)),
        );

        for (const addr of zeroAddresses) {
          expect(directAddresses.has(addr)).toBe(false);
          expect(poolAddresses.has(addr)).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("winner validity: every lotteryPool.winner is one of the pool's entries", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const { lotteryPools } = runLottery(
          allocations,
          MIN_THRESHOLD,
          TARGET_POOL_SIZE,
          seed,
        );

        for (const pool of lotteryPools) {
          const entryAddresses = new Set(pool.entries.map((e) => e.address));
          expect(entryAddresses.has(pool.winner)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("multi-entry pools: every lotteryPool has entries.length >= 2", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const { lotteryPools } = runLottery(
          allocations,
          MIN_THRESHOLD,
          TARGET_POOL_SIZE,
          seed,
        );

        for (const pool of lotteryPools) {
          expect(pool.entries.length).toBeGreaterThanOrEqual(2);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("determinism: same inputs → same outputs", () => {
    fc.assert(
      fc.property(allocationsArb, randaoSeedArb, (allocations, seed) => {
        const r1 = runLottery(allocations, MIN_THRESHOLD, TARGET_POOL_SIZE, seed);
        const r2 = runLottery(allocations, MIN_THRESHOLD, TARGET_POOL_SIZE, seed);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 300 },
    );
  });

  it("promoted solo: when only ONE allocation is sub-threshold and non-zero, it appears in directPayouts", () => {
    // Generate exactly one sub-threshold non-zero allocation plus any number of above-threshold ones
    const subThresholdAmountArb = fc.bigInt({ min: 1n, max: MIN_THRESHOLD - 1n });

    fc.assert(
      fc.property(
        addressArb,
        roleArb,
        subThresholdAmountArb,
        // above-threshold allocations (may be empty)
        fc.uniqueArray(
          fc
            .record({
              address: addressArb,
              amount: fc.bigInt({ min: MIN_THRESHOLD, max: ONE_ENS * 100n }),
              role: roleArb,
            })
            .map(({ address, amount, role }) => ({
              address,
              amount: wei(amount),
              role,
            }) as RewardAllocation),
          {
            maxLength: 10,
            comparator: (a, b) => a.address === b.address,
          },
        ),
        randaoSeedArb,
        (soloAddress, soloRole, soloAmount, aboveAllocations, seed) => {
          // Ensure solo address is not in above allocations
          const aboveAddresses = new Set(aboveAllocations.map((a) => a.address));
          if (aboveAddresses.has(soloAddress)) return; // skip this case

          const soloAlloc: RewardAllocation = {
            address: soloAddress,
            amount: wei(soloAmount),
            role: soloRole,
          };

          const allAllocations = [...aboveAllocations, soloAlloc];

          const { directPayouts, lotteryPools } = runLottery(
            allAllocations,
            MIN_THRESHOLD,
            TARGET_POOL_SIZE,
            seed,
          );

          const directAddresses = new Set(directPayouts.map((p) => p.address));
          const poolAddresses = new Set(
            lotteryPools.flatMap((p) => p.entries.map((e) => e.address)),
          );

          // Solo sub-threshold entry must be promoted to direct
          expect(directAddresses.has(soloAddress)).toBe(true);
          expect(poolAddresses.has(soloAddress)).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });
});
