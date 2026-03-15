import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeTimeWeightedBalance } from "@/time-weighted-balance.js";
import { type BalanceEvent, wei, seconds } from "@/types.js";

const WINDOW_START = seconds(0n);
const WINDOW_END = seconds(15552000n); // 180 days in seconds
const WINDOW_DURATION = 15552000n;

// Arbitrary for a Wei balance value [0, 10^24]
const balanceArb = fc.bigInt({ min: 0n, max: 10n ** 24n });

// Arbitrary for a timestamp inside the window (exclusive of windowEnd)
const timestampArb = fc.bigInt({ min: 1n, max: WINDOW_DURATION - 1n });

// Arbitrary for a BalanceEvent within the window
const balanceEventArb = fc
  .record({
    accountId: fc.string({ minLength: 1, maxLength: 16, unit: "grapheme" }),
    balance: balanceArb,
    delta: balanceArb,
    timestamp: timestampArb,
  })
  .map(({ accountId, balance, delta, timestamp }) => ({
    accountId,
    balance: wei(balance),
    delta: wei(delta),
    timestamp: seconds(timestamp),
  }) as BalanceEvent);

// Unique-timestamp events to avoid dedup surprises in scaling tests
const uniqueTimestampEventsArb = fc
  .uniqueArray(balanceEventArb, {
    maxLength: 20,
    comparator: (a, b) => a.timestamp === b.timestamp,
  });

describe("computeTimeWeightedBalance property tests", () => {
  it("non-negative: result >= 0 for any input", () => {
    fc.assert(
      fc.property(
        fc.array(balanceEventArb, { maxLength: 20 }),
        balanceArb,
        (events, initialBalance) => {
          const result = computeTimeWeightedBalance(
            events,
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance),
          );
          expect(result as bigint).toBeGreaterThanOrEqual(0n);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("bounded above: result <= max(initialBalance, max(event.balance))", () => {
    fc.assert(
      fc.property(
        fc.array(balanceEventArb, { maxLength: 20 }),
        balanceArb,
        (events, initialBalance) => {
          const result = computeTimeWeightedBalance(
            events,
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance),
          );
          const maxBalance =
            events.length === 0
              ? initialBalance
              : events.reduce(
                  (m, e) => (e.balance > m ? e.balance as bigint : m),
                  initialBalance,
                );
          expect(result as bigint).toBeLessThanOrEqual(maxBalance);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("zero initial + no events: result == 0", () => {
    const result = computeTimeWeightedBalance([], WINDOW_START, WINDOW_END, wei(0n));
    expect(result as bigint).toBe(0n);
  });

  it("constant balance throughout: initialBalance=B, no events → TWB = B", () => {
    fc.assert(
      fc.property(balanceArb, (b) => {
        const result = computeTimeWeightedBalance([], WINDOW_START, WINDOW_END, wei(b));
        expect(result as bigint).toBe(b);
      }),
      { numRuns: 200 },
    );
  });

  it("full-window hold: single event sets balance=B at windowStart → TWB = B", () => {
    fc.assert(
      fc.property(balanceArb, (b) => {
        const event: BalanceEvent = {
          accountId: "acc",
          balance: wei(b),
          delta: wei(0n),
          timestamp: WINDOW_START,
        };
        const result = computeTimeWeightedBalance([event], WINDOW_START, WINDOW_END, wei(0n));
        expect(result as bigint).toBe(b);
      }),
      { numRuns: 200 },
    );
  });

  it("linear scaling: TWB(2×balances) ≈ 2×TWB(balances) (within 1 wei)", () => {
    // Generate small even values to avoid truncation issues
    const smallEvenBalanceArb = fc.bigInt({ min: 0n, max: 10n ** 18n }).map((v) => v * 2n);
    const smallEvenEventArb = fc
      .record({
        timestamp: timestampArb,
        balance: smallEvenBalanceArb,
      })
      .map(({ timestamp, balance }) => ({
        accountId: "acc",
        balance: wei(balance),
        delta: wei(0n),
        timestamp: seconds(timestamp),
      }) as BalanceEvent);

    fc.assert(
      fc.property(
        fc.uniqueArray(smallEvenEventArb, {
          maxLength: 10,
          comparator: (a, b) => a.timestamp === b.timestamp,
        }),
        smallEvenBalanceArb,
        (events, initialBalance) => {
          const twb1 = computeTimeWeightedBalance(
            events,
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance),
          );
          const scaledEvents = events.map((e) => ({
            ...e,
            balance: wei((e.balance as bigint) * 2n),
            delta: wei((e.delta as bigint) * 2n),
          }));
          const twb2 = computeTimeWeightedBalance(
            scaledEvents,
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance * 2n),
          );
          const expected2 = (twb1 as bigint) * 2n;
          expect(twb2 as bigint).toBeGreaterThanOrEqual(expected2 - 1n);
          expect(twb2 as bigint).toBeLessThanOrEqual(expected2 + 1n);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("determinism: same inputs → same output (even if events passed unsorted)", () => {
    fc.assert(
      fc.property(
        // Use unique-timestamp events to avoid dedup order-dependence
        fc.uniqueArray(balanceEventArb, {
          maxLength: 20,
          comparator: (a, b) => a.timestamp === b.timestamp,
        }),
        balanceArb,
        (events, initialBalance) => {
          // Reverse the events to simulate unsorted input
          const reversed = [...events].reverse();
          const r1 = computeTimeWeightedBalance(events, WINDOW_START, WINDOW_END, wei(initialBalance));
          const r2 = computeTimeWeightedBalance(reversed, WINDOW_START, WINDOW_END, wei(initialBalance));
          expect(r1 as bigint).toBe(r2 as bigint);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("zero-length window: windowEnd = windowStart → returns 0", () => {
    fc.assert(
      fc.property(
        fc.array(balanceEventArb, { maxLength: 10 }),
        balanceArb,
        (events, initialBalance) => {
          const result = computeTimeWeightedBalance(
            events,
            WINDOW_START,
            WINDOW_START,
            wei(initialBalance),
          );
          expect(result as bigint).toBe(0n);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("event at exact windowEnd is excluded: does not affect result", () => {
    fc.assert(
      fc.property(
        fc.array(balanceEventArb, { maxLength: 10 }),
        balanceArb,
        balanceArb,
        (events, initialBalance, endBalance) => {
          const eventAtEnd: BalanceEvent = {
            accountId: "end-acc",
            balance: wei(endBalance),
            delta: wei(0n),
            timestamp: WINDOW_END,
          };
          const withoutEnd = computeTimeWeightedBalance(
            events,
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance),
          );
          const withEnd = computeTimeWeightedBalance(
            [...events, eventAtEnd],
            WINDOW_START,
            WINDOW_END,
            wei(initialBalance),
          );
          expect(withEnd as bigint).toBe(withoutEnd as bigint);
        },
      ),
      { numRuns: 200 },
    );
  });
});
