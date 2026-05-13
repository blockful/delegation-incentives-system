import { describe, it, expect } from "vitest";
import { computeTokenHolderRewards } from "../../src/token-holder-rewards.js";
import type { Address, Wei } from "../../src/types.js";
import { wei } from "../../src/types.js";
import { applyBps } from "../../src/util/bigint-math.js";
import { TOKEN_HOLDER_POOL_BPS, TOKEN_HOLDER_CAP_BPS } from "../../src/config.js";

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
describe("computeTokenHolderRewards", () => {
  it("returns empty array for empty input", () => {
    const result = computeTokenHolderRewards(new Map(), wei(1000n * ENS));
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Proportional allocation without caps
  // ---------------------------------------------------------------------------
  it("allocates proportionally when no token holder exceeds the cap", () => {
    // Pool = 1_000_000 ENS -> tokenHolderSubPool = 900_000, cap = 50_000 ENS.
    // 30 equal token holders -> each gets 30_000 ENS (below 50_000 cap).
    const poolSize = wei(1_000_000n * ENS);
    const tokenHolderSubPool = applyBps(poolSize, TOKEN_HOLDER_POOL_BPS); // 900_000 ENS
    const tokenHolderCap = applyBps(poolSize, TOKEN_HOLDER_CAP_BPS); // 50_000 ENS

    expect(tokenHolderSubPool).toBe(900_000n * ENS);
    expect(tokenHolderCap).toBe(50_000n * ENS);

    const twbs = new Map<Address, Wei>();
    for (let i = 0; i < 30; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twbs.set(addr, wei(100n * ENS));
    }

    const result = computeTokenHolderRewards(twbs, poolSize);

    expect(result).toHaveLength(30);
    expect(totalRewards(result)).toBe(tokenHolderSubPool);

    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(tokenHolderCap as bigint);
      expect(r.reward).toBe(30_000n * ENS);
    }
  });

  it("allocates proportionally with different weights", () => {
    // Pool = 1_000_000 ENS -> tokenHolderSubPool = 900_000, cap = 50_000 ENS.
    // Three token holders: 10, 20, 30 weight -> total 60.
    // Raw: 150_000, 300_000, 450_000.
    // All exceed cap, so redistribution will run.
    const poolSize = wei(1_000_000n * ENS);
    const tokenHolderSubPool = applyBps(poolSize, TOKEN_HOLDER_POOL_BPS);
    const tokenHolderCap = applyBps(poolSize, TOKEN_HOLDER_CAP_BPS);

    const twbs = new Map<Address, Wei>([
      ["0xaaaa", wei(10n * ENS)],
      ["0xbbbb", wei(20n * ENS)],
      ["0xcccc", wei(30n * ENS)],
    ]);

    const result = computeTokenHolderRewards(twbs, poolSize);

    expect(totalRewards(result)).toBeLessThanOrEqual(tokenHolderSubPool);
    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(tokenHolderCap as bigint);
    }
  });

  // ---------------------------------------------------------------------------
  // Cap enforcement
  // ---------------------------------------------------------------------------
  it("enforces per-token-holder cap and redistributes excess", () => {
    // Pool = 1_000_000 ENS -> tokenHolderSubPool = 900_000, cap = 50_000.
    // One whale with 90% weight, others share 10%.
    // Whale raw = 810_000 ENS >> cap of 50_000.
    const poolSize = wei(1_000_000n * ENS);
    const tokenHolderCap = applyBps(poolSize, TOKEN_HOLDER_CAP_BPS);

    const twbs = new Map<Address, Wei>([
      ["0xaaaa", wei(9_000n * ENS)], // 90%
      ["0xbbbb", wei(500n * ENS)], // 5%
      ["0xcccc", wei(500n * ENS)], // 5%
    ]);

    const result = computeTokenHolderRewards(twbs, poolSize);

    expect(result).toHaveLength(3);
    expect(totalRewards(result)).toBeLessThanOrEqual(900_000n * ENS);

    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(tokenHolderCap);
  });

  it("caps correctly with many small token holders and one whale", () => {
    // Pool = 1_000_000 ENS -> tokenHolderSubPool = 900_000, cap = 50_000.
    // 1 whale (weight 95), 19 smalls (weight 5/19 ~= 0.26 each).
    const poolSize = wei(1_000_000n * ENS);
    const tokenHolderSubPool = applyBps(poolSize, TOKEN_HOLDER_POOL_BPS);
    const tokenHolderCap = applyBps(poolSize, TOKEN_HOLDER_CAP_BPS);

    const twbs = new Map<Address, Wei>();
    twbs.set("0x0000", wei(9_500n * ENS)); // whale
    for (let i = 1; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twbs.set(addr, wei(500n * ENS / 19n));
    }

    const result = computeTokenHolderRewards(twbs, poolSize);

    expect(totalRewards(result)).toBe(tokenHolderSubPool);
    // Whale should be capped.
    const whaleReward = result.find((r) => r.address === "0x0000")!.reward;
    expect(whaleReward as bigint).toBeLessThanOrEqual(
      (tokenHolderCap as bigint) + (tokenHolderSubPool as bigint), // capped + possible dust
    );
  });

  // ---------------------------------------------------------------------------
  // Pool size invariant
  // ---------------------------------------------------------------------------
  it("sum of rewards equals token-holder sub-pool exactly", () => {
    // Use prime numbers to maximize rounding issues.
    const poolSize = wei(777_773n * ENS);
    const tokenHolderSubPool = applyBps(poolSize, TOKEN_HOLDER_POOL_BPS);

    const twbs = new Map<Address, Wei>();
    for (let i = 0; i < 30; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twbs.set(addr, wei(100n * ENS));
    }

    const result = computeTokenHolderRewards(twbs, poolSize);
    expect(totalRewards(result)).toBe(tokenHolderSubPool);
  });

  // ---------------------------------------------------------------------------
  // Output is sorted by address
  // ---------------------------------------------------------------------------
  it("returns results sorted by address", () => {
    const poolSize = wei(1_000_000n * ENS);
    const twbs = new Map<Address, Wei>([
      ["0xcccc", wei(100n * ENS)],
      ["0xaaaa", wei(200n * ENS)],
      ["0xbbbb", wei(300n * ENS)],
    ]);

    const result = computeTokenHolderRewards(twbs, poolSize);
    expect(result.map((r) => r.address)).toEqual([
      "0xaaaa",
      "0xbbbb",
      "0xcccc",
    ]);
  });

  // ---------------------------------------------------------------------------
  // Single token holder
  // ---------------------------------------------------------------------------
  it("single token holder is capped and leaves the remainder unallocated", () => {
    const poolSize = wei(1_000_000n * ENS);
    const tokenHolderSubPool = applyBps(poolSize, TOKEN_HOLDER_POOL_BPS); // 900_000 ENS
    const tokenHolderCap = applyBps(poolSize, TOKEN_HOLDER_CAP_BPS); // 50_000 ENS

    const twbs = new Map<Address, Wei>([["0xaaaa", wei(1_000n * ENS)]]);

    const result = computeTokenHolderRewards(twbs, poolSize);

    expect(result).toHaveLength(1);
    expect(result[0].reward).toBe(tokenHolderCap);
    expect(totalRewards(result)).toBe(tokenHolderCap);
    expect(totalRewards(result)).toBeLessThan(tokenHolderSubPool as bigint);
  });
});
