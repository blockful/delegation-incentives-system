import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { allocateWithCap } from "@/cap-redistribution.js";
import { type AllocationInput, wei } from "@/types.js";
import { sum } from "@/util/bigint-math.js";

// Arbitrary for allocation inputs
const allocationInputArb = fc
  .record({
    id: fc.string({ minLength: 4, maxLength: 8, unit: "grapheme" }),
    weight: fc.bigInt({ min: 0n, max: 10n ** 24n }),
  })
  .map(({ id, weight }) => ({ id, weight: wei(weight) }) as AllocationInput);

const inputsArb = fc.uniqueArray(allocationInputArb, {
  minLength: 1,
  maxLength: 20,
  comparator: (a, b) => a.id === b.id,
});

const poolArb = fc.bigInt({ min: 1n, max: 10n ** 30n });
const capArb = fc.bigInt({ min: 1n, max: 10n ** 30n });

describe("allocateWithCap property tests", () => {
  it("conservation: sum of allocations <= totalPool", () => {
    fc.assert(
      fc.property(inputsArb, poolArb, capArb, (inputs, pool, cap) => {
        const result = allocateWithCap(inputs, pool, cap);
        const total = sum(result.map((r) => r.amount as bigint));
        expect(total).toBeLessThanOrEqual(pool);
      }),
      { numRuns: 500 },
    );
  });

  it("cap respected: no allocation exceeds perRecipientCap", () => {
    fc.assert(
      fc.property(inputsArb, poolArb, capArb, (inputs, pool, cap) => {
        const result = allocateWithCap(inputs, pool, cap);
        for (const r of result) {
          expect(r.amount as bigint).toBeLessThanOrEqual(cap);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("non-negativity: all allocations >= 0", () => {
    fc.assert(
      fc.property(inputsArb, poolArb, capArb, (inputs, pool, cap) => {
        const result = allocateWithCap(inputs, pool, cap);
        for (const r of result) {
          expect(r.amount as bigint).toBeGreaterThanOrEqual(0n);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("preserves all input IDs", () => {
    fc.assert(
      fc.property(inputsArb, poolArb, capArb, (inputs, pool, cap) => {
        const result = allocateWithCap(inputs, pool, cap);
        expect(result.length).toBe(inputs.length);
        const resultIds = new Set(result.map((r) => r.id));
        for (const input of inputs) {
          expect(resultIds.has(input.id)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("deterministic: same input produces same output", () => {
    fc.assert(
      fc.property(inputsArb, poolArb, capArb, (inputs, pool, cap) => {
        const r1 = allocateWithCap(inputs, pool, cap);
        const r2 = allocateWithCap(inputs, pool, cap);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 200 },
    );
  });
});
