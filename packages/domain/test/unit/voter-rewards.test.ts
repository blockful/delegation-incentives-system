import { describe, it, expect } from "vitest";
import {
  computeVoterRewards,
  computeVoterRewardsDetailed,
} from "../../src/voter-rewards.js";
import type { Address, Wei } from "../../src/types.js";
import { wei } from "../../src/types.js";
import { applyBps } from "../../src/util/bigint-math.js";
import { VOTER_POOL_BPS, VOTER_CAP_BPS } from "../../src/config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENS = 10n ** 18n;

function totalRewards(allocations: { reward: Wei }[]): bigint {
  return allocations.reduce((acc, a) => acc + (a.reward as bigint), 0n);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("computeVoterRewards", () => {
  it("returns empty array for empty input", () => {
    const result = computeVoterRewards(new Map(), wei(1000n * ENS));
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Proportional allocation without caps
  // ---------------------------------------------------------------------------
  it("allocates proportionally when no voter exceeds the cap", () => {
    // Pool = 1_500_000 ENS -> voterSubPool = 150_000, voterCap = 15_000 ENS.
    // 20 equal voters: each gets 150_000/20 = 7_500 < 15_000 cap.
    const poolSize = wei(1_500_000n * ENS);
    const voterSubPool = applyBps(poolSize, VOTER_POOL_BPS); // 150_000 ENS
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS); // 15_000 ENS

    const avps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      avps.set(addr, wei(100n * ENS));
    }

    const result = computeVoterRewards(avps, poolSize);

    expect(result).toHaveLength(20);
    expect(totalRewards(result)).toBe(voterSubPool);

    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(voterCap as bigint);
      expect(r.reward).toBe(7_500n * ENS);
    }
  });

  it("allocates proportionally with many small voters", () => {
    // Pool = 1_000_000 ENS, voterSubPool = 100_000, voterCap = 10_000 ENS.
    // 20 voters with equal weight -> each gets 5_000 ENS (below 10_000 cap).
    const poolSize = wei(1_000_000n * ENS);
    const voterSubPool = applyBps(poolSize, VOTER_POOL_BPS); // 100_000 ENS
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS); // 10_000 ENS

    expect(voterSubPool).toBe(100_000n * ENS);
    expect(voterCap).toBe(10_000n * ENS);

    const avps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      avps.set(addr, wei(100n * ENS));
    }

    const result = computeVoterRewards(avps, poolSize);

    expect(result).toHaveLength(20);
    expect(totalRewards(result)).toBe(voterSubPool);

    for (const r of result) {
      // Each gets 100_000 / 20 = 5_000 ENS, well below 10_000 cap.
      expect(r.reward as bigint).toBeLessThanOrEqual(voterCap as bigint);
      expect(r.reward).toBe(5_000n * ENS);
    }
  });

  // ---------------------------------------------------------------------------
  // Cap enforcement
  // ---------------------------------------------------------------------------
  it("enforces per-voter cap and redistributes excess", () => {
    // Pool = 1_000_000 ENS -> voterSubPool = 100_000, cap = 10_000 ENS.
    // One voter has 90% of AVP, the other 10%.
    // Without cap: A gets 90_000, B gets 10_000.
    // A is capped at 10_000. Excess = 80_000 redistributed to B.
    // B: 10_000 + 80_000 = 90_000 (exceeds cap again).
    // B capped at 10_000. The remaining 80_000 stays unallocated.
    const poolSize = wei(1_000_000n * ENS);
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS); // 10_000 ENS

    const avps = new Map<Address, Wei>([
      ["0xaaaa", wei(9_000n * ENS)], // 90%
      ["0xbbbb", wei(1_000n * ENS)], // 10%
    ]);

    const result = computeVoterRewards(avps, poolSize);

    expect(result).toHaveLength(2);
    expect(totalRewards(result)).toBe(20_000n * ENS);

    // Both are capped at 10_000.
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(voterCap);
    expect(byAddr.get("0xbbbb")).toBe(voterCap);
  });

  it("caps redistribute correctly with uneven weights", () => {
    // Pool = 1_000_000 ENS -> voterSubPool = 100_000, cap = 10_000.
    // 5 voters: 4 small (weight 1k each), 1 large (weight 96k).
    // Raw: small each gets ~1_000, large gets ~96_000.
    // Large capped to 10_000, excess = 86_000 redistributed to smalls.
    // Each small: 1_000 + 86_000*(1k/4k) = 1_000 + 21_500 = 22_500 (exceeds cap).
    const poolSize = wei(1_000_000n * ENS);
    const voterSubPool = applyBps(poolSize, VOTER_POOL_BPS);
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS);

    const avps = new Map<Address, Wei>([
      ["0xaaaa", wei(1_000n * ENS)],
      ["0xbbbb", wei(1_000n * ENS)],
      ["0xcccc", wei(1_000n * ENS)],
      ["0xdddd", wei(1_000n * ENS)],
      ["0xeeee", wei(96_000n * ENS)],
    ]);

    const result = computeVoterRewards(avps, poolSize);

    expect(totalRewards(result)).toBeLessThanOrEqual(voterSubPool);
    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(voterCap as bigint);
    }
  });

  // ---------------------------------------------------------------------------
  // Single voter is capped
  // ---------------------------------------------------------------------------
  it("single voter is capped and leaves the remainder unallocated", () => {
    const poolSize = wei(1_000_000n * ENS);
    const voterSubPool = applyBps(poolSize, VOTER_POOL_BPS); // 100_000 ENS
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS); // 10_000 ENS

    const avps = new Map<Address, Wei>([
      ["0xaaaa", wei(1_000_000n * ENS)],
    ]);

    const result = computeVoterRewards(avps, poolSize);

    expect(result).toHaveLength(1);
    expect(result[0].reward).toBe(voterCap);
    expect(totalRewards(result)).toBe(voterCap);
    expect(totalRewards(result)).toBeLessThan(voterSubPool as bigint);
  });

  // ---------------------------------------------------------------------------
  // Pool size invariant
  // ---------------------------------------------------------------------------
  it("sum of rewards equals voter sub-pool exactly", () => {
    // Use prime numbers to maximize rounding issues.
    const poolSize = wei(999_997n * ENS);
    const voterSubPool = applyBps(poolSize, VOTER_POOL_BPS);

    const avps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      avps.set(addr, wei(100n * ENS));
    }

    const result = computeVoterRewards(avps, poolSize);
    expect(totalRewards(result)).toBe(voterSubPool);
  });

  // ---------------------------------------------------------------------------
  // Output is sorted by address
  // ---------------------------------------------------------------------------
  it("returns results sorted by address", () => {
    const poolSize = wei(1_000_000n * ENS);
    const avps = new Map<Address, Wei>([
      ["0xcccc", wei(100n * ENS)],
      ["0xaaaa", wei(200n * ENS)],
      ["0xbbbb", wei(300n * ENS)],
    ]);

    const result = computeVoterRewards(avps, poolSize);
    expect(result.map((r) => r.address)).toEqual([
      "0xaaaa",
      "0xbbbb",
      "0xcccc",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Detailed provenance variant
// ---------------------------------------------------------------------------
describe("computeVoterRewardsDetailed", () => {
  it("reports AVP, pool share, raw reward, and cap status per voter", () => {
    // Pool = 1_000_000 ENS -> voterSubPool = 100_000, cap = 10_000.
    // 0xaaaa has 90% of AVP (raw 90_000, capped at 10_000),
    // 0xbbbb has 10% (raw 10_000, then receives the excess and is capped too).
    const poolSize = wei(1_000_000n * ENS);
    const voterCap = applyBps(poolSize, VOTER_CAP_BPS); // 10_000 ENS

    const avps = new Map<Address, Wei>([
      ["0xaaaa", wei(9_000n * ENS)],
      ["0xbbbb", wei(1_000n * ENS)],
    ]);

    const { allocations, provenance } = computeVoterRewardsDetailed(
      avps,
      poolSize,
    );

    expect(allocations).toHaveLength(2);
    expect(provenance.size).toBe(2);

    const whale = provenance.get("0xaaaa")!;
    expect(whale.avgVotingPower).toBe(9_000n * ENS);
    expect(whale.poolSharePct).toBe("90.00");
    expect(whale.rawReward).toBe(90_000n * ENS);
    expect(whale.capStatus).toBe("reached_cap");
    expect(whale.redistributionReceived).toBe(0n);

    const minnow = provenance.get("0xbbbb")!;
    expect(minnow.avgVotingPower).toBe(1_000n * ENS);
    expect(minnow.poolSharePct).toBe("10.00");
    expect(minnow.rawReward).toBe(10_000n * ENS);
    // 10_000 == cap exactly, then redistribution pushes it over -> capped.
    expect(minnow.capStatus).toBe("reached_cap");

    const byAddr = new Map(allocations.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(voterCap);
    expect(byAddr.get("0xbbbb")).toBe(voterCap);
  });

  it("reports not_affected when no voter exceeds the cap", () => {
    const poolSize = wei(1_500_000n * ENS);
    const avps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      avps.set(addr, wei(100n * ENS));
    }

    const { provenance } = computeVoterRewardsDetailed(avps, poolSize);

    for (const detail of provenance.values()) {
      expect(detail.capStatus).toBe("not_affected");
      expect(detail.poolSharePct).toBe("5.00");
      expect(detail.rawReward).toBe(7_500n * ENS);
      expect(detail.redistributionReceived).toBe(0n);
    }
  });

  it("reports received_redistribution with the amount received", () => {
    // Pool = 1_000_000 ENS -> voterSubPool = 100_000, cap = 10_000.
    // 11 voters, total AVP 110_000: one whale (12_000) whose raw allocation
    // 10_909.09 slightly exceeds the cap, ten receivers (9_800 each) whose
    // raw 8_909.09 plus ~1/10 of the ~909 excess stays under the cap.
    const poolSize = wei(1_000_000n * ENS);
    const avps = new Map<Address, Wei>();
    avps.set("0xffff", wei(12_000n * ENS));
    for (let i = 0; i < 10; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      avps.set(addr, wei(9_800n * ENS));
    }

    const { allocations, provenance } = computeVoterRewardsDetailed(
      avps,
      poolSize,
    );
    const finalByAddr = new Map(
      allocations.map((r) => [r.address, r.reward as bigint]),
    );

    const whale = provenance.get("0xffff")!;
    expect(whale.capStatus).toBe("reached_cap");
    expect(whale.redistributionReceived).toBe(0n);
    expect(finalByAddr.get("0xffff")).toBe(10_000n * ENS);

    for (let i = 0; i < 10; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      const receiver = provenance.get(addr)!;
      expect(receiver.capStatus).toBe("received_redistribution");
      expect(receiver.redistributionReceived).toBeGreaterThan(0n);
      // final = raw + redistribution received (+ dust for one address).
      expect(finalByAddr.get(addr)!).toBeGreaterThanOrEqual(
        (receiver.rawReward as bigint) +
          (receiver.redistributionReceived as bigint),
      );
    }
  });
});
