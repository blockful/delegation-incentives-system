import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { consolidateDelegators } from "@/protocol-dedup.js";
import {
  type DelegatorScore,
  type ProtocolMapping,
  type WalletAlias,
  wei,
  ONE_ENS,
} from "@/types.js";

// Arbitrary for an Ethereum-style address (lowercase)
const addressArb = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((s) => "0x" + s.toLowerCase());

// Arbitrary for a unique set of addresses
const uniqueAddressesArb = (minLength: number, maxLength: number) =>
  fc.uniqueArray(addressArb, { minLength, maxLength });

// Arbitrary for a DelegatorScore
const scoreArb = fc
  .record({
    delegatorId: addressArb,
    delegateId: addressArb,
    twb: fc.bigInt({ min: 0n, max: 1000n * ONE_ENS }),
  })
  .map(({ delegatorId, delegateId, twb }) => ({
    delegatorId,
    delegateId,
    timeWeightedBalance: wei(twb),
  }));

// Build an array of scores with unique delegatorIds
const uniqueScoresArb = fc
  .array(
    fc.record({
      delegateId: addressArb,
      twb: fc.bigInt({ min: 0n, max: 1000n * ONE_ENS }),
    }),
    { minLength: 1, maxLength: 10 },
  )
  .chain((records) =>
    uniqueAddressesArb(records.length, records.length).map((addrs) =>
      addrs.map((addr, i) => ({
        delegatorId: addr,
        delegateId: records[i].delegateId,
        timeWeightedBalance: wei(records[i].twb),
      })),
    ),
  );

function sumTwb(scores: DelegatorScore[]): bigint {
  return scores.reduce((acc, s) => acc + s.timeWeightedBalance, 0n);
}

describe("consolidateDelegators — property tests", () => {
  it("conserves total TWB (no mappings)", () => {
    fc.assert(
      fc.property(uniqueScoresArb, (scores) => {
        const result = consolidateDelegators(scores, [], []);
        expect(sumTwb(result)).toBe(sumTwb(scores));
      }),
      { numRuns: 200 },
    );
  });

  it("conserves total TWB with protocol mappings", () => {
    fc.assert(
      fc.property(
        // Generate 2–6 scores, then randomly map some to others
        uniqueAddressesArb(2, 6).chain((addrs) => {
          const scoresArb = fc.tuple(
            ...addrs.map((addr) =>
              fc
                .record({
                  delegateId: addressArb,
                  twb: fc.bigInt({ min: 0n, max: 500n * ONE_ENS }),
                })
                .map(({ delegateId, twb }) => ({
                  delegatorId: addr,
                  delegateId,
                  timeWeightedBalance: wei(twb),
                })),
            ),
          );
          // Create 0–3 mappings between addresses in the set
          const mappingsArb = fc
            .array(
              fc.record({
                from: fc.integer({ min: 0, max: addrs.length - 1 }),
                to: fc.integer({ min: 0, max: addrs.length - 1 }),
              }),
              { minLength: 0, maxLength: 3 },
            )
            .map((pairs) =>
              pairs
                .filter((p) => p.from !== p.to) // no self-mappings
                .map(
                  (p): ProtocolMapping => ({
                    childAddress: addrs[p.from],
                    operatorAddress: addrs[p.to],
                    protocol: "test",
                  }),
                ),
            );
          return fc.tuple(scoresArb, mappingsArb);
        }),
        ([scores, mappings]) => {
          const result = consolidateDelegators(scores, mappings, []);
          expect(sumTwb(result)).toBe(sumTwb(scores));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("conserves total TWB with wallet aliases", () => {
    fc.assert(
      fc.property(
        uniqueAddressesArb(2, 6).chain((addrs) => {
          const scoresArb = fc.tuple(
            ...addrs.map((addr) =>
              fc
                .record({
                  delegateId: addressArb,
                  twb: fc.bigInt({ min: 0n, max: 500n * ONE_ENS }),
                })
                .map(({ delegateId, twb }) => ({
                  delegatorId: addr,
                  delegateId,
                  timeWeightedBalance: wei(twb),
                })),
            ),
          );
          const aliasesArb = fc
            .array(
              fc.record({
                from: fc.integer({ min: 0, max: addrs.length - 1 }),
                to: fc.integer({ min: 0, max: addrs.length - 1 }),
              }),
              { minLength: 0, maxLength: 3 },
            )
            .map((pairs) =>
              pairs
                .filter((p) => p.from !== p.to)
                .map(
                  (p): WalletAlias => ({
                    secondaryAddress: addrs[p.from],
                    primaryAddress: addrs[p.to],
                    source: "test",
                  }),
                ),
            );
          return fc.tuple(scoresArb, aliasesArb);
        }),
        ([scores, aliases]) => {
          const result = consolidateDelegators(scores, [], aliases);
          expect(sumTwb(result)).toBe(sumTwb(scores));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("output count <= input count (consolidation never creates new entities)", () => {
    fc.assert(
      fc.property(
        uniqueAddressesArb(1, 8).chain((addrs) => {
          const scoresArb = fc.tuple(
            ...addrs.map((addr) =>
              fc.constant({
                delegatorId: addr,
                delegateId: addr, // simplify
                timeWeightedBalance: wei(ONE_ENS),
              }),
            ),
          );
          const mappingsArb = fc
            .array(
              fc.record({
                from: fc.integer({ min: 0, max: addrs.length - 1 }),
                to: fc.integer({ min: 0, max: addrs.length - 1 }),
              }),
              { minLength: 0, maxLength: 4 },
            )
            .map((pairs) =>
              pairs
                .filter((p) => p.from !== p.to)
                .map(
                  (p): ProtocolMapping => ({
                    childAddress: addrs[p.from],
                    operatorAddress: addrs[p.to],
                    protocol: "test",
                  }),
                ),
            );
          return fc.tuple(scoresArb, mappingsArb);
        }),
        ([scores, mappings]) => {
          const result = consolidateDelegators(scores, mappings, []);
          expect(result.length).toBeLessThanOrEqual(scores.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("no mappings = identity (output matches input count)", () => {
    fc.assert(
      fc.property(uniqueScoresArb, (scores) => {
        const result = consolidateDelegators(scores, [], []);
        expect(result.length).toBe(scores.length);
      }),
      { numRuns: 200 },
    );
  });

  it("all output delegatorIds are lowercase", () => {
    fc.assert(
      fc.property(
        uniqueAddressesArb(1, 6).chain((addrs) => {
          // Introduce mixed-case variants
          const mixedAddrs = addrs.map((a, i) =>
            i % 2 === 0 ? a : a.slice(0, 2) + a.slice(2).toUpperCase(),
          );
          const scoresArb = fc.tuple(
            ...mixedAddrs.map((addr) =>
              fc.constant({
                delegatorId: addr,
                delegateId: "0x" + "d".repeat(40),
                timeWeightedBalance: wei(ONE_ENS),
              }),
            ),
          );
          const mappingsArb = fc
            .array(
              fc.record({
                from: fc.integer({ min: 0, max: addrs.length - 1 }),
                to: fc.integer({ min: 0, max: addrs.length - 1 }),
              }),
              { minLength: 0, maxLength: 3 },
            )
            .map((pairs) =>
              pairs
                .filter((p) => p.from !== p.to)
                .map(
                  (p): ProtocolMapping => ({
                    childAddress: mixedAddrs[p.from],
                    operatorAddress: mixedAddrs[p.to],
                    protocol: "test",
                  }),
                ),
            );
          return fc.tuple(scoresArb, mappingsArb);
        }),
        ([scores, mappings]) => {
          const result = consolidateDelegators(scores, mappings, []);
          for (const s of result) {
            expect(s.delegatorId).toBe(s.delegatorId.toLowerCase());
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("deterministic: same input always produces same output", () => {
    fc.assert(
      fc.property(
        uniqueScoresArb,
        fc
          .array(
            fc.record({
              childAddress: addressArb,
              operatorAddress: addressArb,
              protocol: fc.constant("test"),
            }),
            { minLength: 0, maxLength: 3 },
          )
          .map((arr) => arr.filter((m) => m.childAddress !== m.operatorAddress)),
        (scores, mappings) => {
          const r1 = consolidateDelegators(scores, mappings, []);
          const r2 = consolidateDelegators(scores, mappings, []);
          expect(r1).toEqual(r2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("never throws regardless of input (resilience to cycles, deep chains, etc.)", () => {
    fc.assert(
      fc.property(
        fc.array(scoreArb, { minLength: 0, maxLength: 10 }),
        fc.array(
          fc.record({
            childAddress: addressArb,
            operatorAddress: addressArb,
            protocol: fc.constant("test"),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        fc.array(
          fc.record({
            secondaryAddress: addressArb,
            primaryAddress: addressArb,
            source: fc.constant("test"),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (scores, mappings, aliases) => {
          expect(() =>
            consolidateDelegators(scores, mappings, aliases),
          ).not.toThrow();
        },
      ),
      { numRuns: 300 },
    );
  });

  it("empty input returns empty output", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            childAddress: addressArb,
            operatorAddress: addressArb,
            protocol: fc.constant("test"),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        fc.array(
          fc.record({
            secondaryAddress: addressArb,
            primaryAddress: addressArb,
            source: fc.constant("test"),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (mappings, aliases) => {
          const result = consolidateDelegators([], mappings, aliases);
          expect(result).toEqual([]);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("transitive chain resolution: A→B + B→C yields single entity at C", () => {
    fc.assert(
      fc.property(
        uniqueAddressesArb(3, 3),
        fc.bigInt({ min: 1n, max: 100n }),
        fc.bigInt({ min: 1n, max: 100n }),
        fc.bigInt({ min: 1n, max: 100n }),
        (addrs, twb1, twb2, twb3) => {
          const [a, b, c] = addrs;
          const delegate = "0x" + "d".repeat(40);
          const scores: DelegatorScore[] = [
            { delegatorId: a, delegateId: delegate, timeWeightedBalance: wei(twb1 * ONE_ENS) },
            { delegatorId: b, delegateId: delegate, timeWeightedBalance: wei(twb2 * ONE_ENS) },
            { delegatorId: c, delegateId: delegate, timeWeightedBalance: wei(twb3 * ONE_ENS) },
          ];
          const mappings: ProtocolMapping[] = [
            { childAddress: a, operatorAddress: b, protocol: "test" },
          ];
          const aliases: WalletAlias[] = [
            { secondaryAddress: b, primaryAddress: c, source: "test" },
          ];
          const result = consolidateDelegators(scores, mappings, aliases);
          expect(result.length).toBe(1);
          expect(result[0].delegatorId).toBe(c);
          expect(result[0].timeWeightedBalance).toBe(
            wei((twb1 + twb2 + twb3) * ONE_ENS),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
