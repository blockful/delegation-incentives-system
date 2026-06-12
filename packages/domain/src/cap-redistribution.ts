import type { Address, CapStatus, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { min, sum } from "./util/bigint-math.js";

/**
 * Per-address outcome of cap redistribution, used to build reward provenance.
 */
export interface CapAllocationDetail {
  /** Pre-cap pro-rata allocation. */
  readonly rawReward: Wei;
  /** Final allocation after caps, redistribution, and dust assignment. */
  readonly finalReward: Wei;
  readonly capStatus: CapStatus;
  /**
   * Excess received from capped wallets during redistribution iterations.
   * Excludes integer-rounding dust; "0" unless capStatus is
   * "received_redistribution".
   */
  readonly redistributionReceived: Wei;
}

export interface CapRedistributionOutcome {
  /** Final capped allocations, sorted by address. */
  readonly allocations: RewardAllocation[];
  /** Per-address detail keyed by allocation address. */
  readonly details: Map<Address, CapAllocationDetail>;
}

/**
 * Iterative cap redistribution.
 *
 * 1. Find all entries where reward > cap
 * 2. Set their reward to cap
 * 3. Redistribute excess pro-rata to uncapped entries (by their weight)
 * 4. Repeat until no one exceeds cap
 *
 * Dust from integer rounding goes to the largest positive-weight allocation
 * that is still under the cap. Ties are broken by lowest address
 * (lexicographic). If every positive-weight recipient is capped, the
 * remainder is left unallocated.
 *
 * @param allocations - Initial reward allocations
 * @param weights - Weight for each address (used for pro-rata redistribution)
 * @param cap - Maximum reward per address
 * @param totalPool - Total pool size (for dust verification)
 * @returns Final capped allocations
 */
export function applyCapRedistribution(
  allocations: readonly RewardAllocation[],
  weights: ReadonlyMap<Address, Wei>,
  cap: Wei,
  totalPool: Wei,
): RewardAllocation[] {
  return applyCapRedistributionDetailed(allocations, weights, cap, totalPool)
    .allocations;
}

/**
 * Same algorithm as {@link applyCapRedistribution}, but also reports the
 * per-address outcome (raw vs final reward, cap status, redistribution
 * received) so callers can persist allocation provenance.
 */
export function applyCapRedistributionDetailed(
  allocations: readonly RewardAllocation[],
  weights: ReadonlyMap<Address, Wei>,
  cap: Wei,
  totalPool: Wei,
): CapRedistributionOutcome {
  if (allocations.length === 0) {
    return { allocations: [], details: new Map() };
  }

  // Mutable working map: address -> current reward (as raw bigint).
  const rewards = new Map<Address, bigint>();
  // Original pre-cap allocations, kept for provenance.
  const rawRewards = new Map<Address, bigint>();
  for (const a of allocations) {
    rewards.set(a.address, a.reward as bigint);
    rawRewards.set(a.address, a.reward as bigint);
  }

  // Track which addresses are permanently capped.
  const capped = new Set<Address>();

  // Track redistribution received per address (excludes dust).
  const redistributed = new Map<Address, bigint>();

  // Max iterations = allocations.length. At least one address gets capped
  // per round, so convergence is guaranteed.
  const maxIter = allocations.length;

  for (let iter = 0; iter < maxIter; iter++) {
    // 1. Find newly capped entries and compute total excess.
    let excess = 0n;
    let newlyCapped = false;

    for (const [addr, reward] of rewards) {
      if (!capped.has(addr) && reward > (cap as bigint)) {
        excess += reward - (cap as bigint);
        rewards.set(addr, cap as bigint);
        capped.add(addr);
        newlyCapped = true;
      }
    }

    if (!newlyCapped) break;

    // 2. Compute total weight of uncapped entries.
    let uncappedWeightTotal = 0n;
    for (const [addr] of rewards) {
      if (!capped.has(addr)) {
        uncappedWeightTotal += (weights.get(addr) ?? 0n) as bigint;
      }
    }

    // If no uncapped entries remain, the excess cannot be redistributed.
    if (uncappedWeightTotal === 0n) break;

    // 3. Redistribute excess pro-rata by weight to uncapped entries.
    for (const [addr, reward] of rewards) {
      if (!capped.has(addr)) {
        const w = (weights.get(addr) ?? 0n) as bigint;
        const share = (excess * w) / uncappedWeightTotal;
        rewards.set(addr, reward + share);
        if (share > 0n) {
          redistributed.set(addr, (redistributed.get(addr) ?? 0n) + share);
        }
      }
    }
  }

  // 4. Dust assignment: totalPool - sum(all rewards).
  const rewardValues = [...rewards.values()];
  const totalAssigned = sum(rewardValues);
  const dust = (totalPool as bigint) - totalAssigned;

  if (dust > 0n) {
    // Find the largest uncapped positive-weight allocation that still has room.
    let dustRecipient: Address | undefined;
    let maxReward = -1n;

    for (const [addr, reward] of rewards) {
      if (capped.has(addr)) continue;
      if (((weights.get(addr) ?? 0n) as bigint) <= 0n) continue;
      if (reward >= (cap as bigint)) continue;
      if (
        reward > maxReward ||
        (reward === maxReward &&
          (dustRecipient === undefined || addr < dustRecipient))
      ) {
        maxReward = reward;
        dustRecipient = addr;
      }
    }

    if (dustRecipient !== undefined) {
      const currentReward = rewards.get(dustRecipient) ?? 0n;
      rewards.set(
        dustRecipient,
        currentReward + min(dust, (cap as bigint) - currentReward),
      );
    }
  }

  // 5. Build sorted output.
  const result: RewardAllocation[] = [...rewards.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([address, reward]) => ({
      address,
      reward: wei(reward),
    }));

  // 6. Build per-address provenance detail.
  // A wallet that received redistribution in an early iteration and was
  // capped in a later one reports "reached_cap" (the cap is what determined
  // its final reward).
  const details = new Map<Address, CapAllocationDetail>();
  for (const { address, reward } of result) {
    const raw = rawRewards.get(address) ?? 0n;
    const received = redistributed.get(address) ?? 0n;

    let capStatus: CapStatus;
    let redistributionReceived: bigint;
    if (capped.has(address)) {
      capStatus = "reached_cap";
      redistributionReceived = 0n;
    } else if (received > 0n) {
      capStatus = "received_redistribution";
      redistributionReceived = received;
    } else {
      capStatus = "not_affected";
      redistributionReceived = 0n;
    }

    details.set(address, {
      rawReward: wei(raw),
      finalReward: reward,
      capStatus,
      redistributionReceived: wei(redistributionReceived),
    });
  }

  return { allocations: result, details };
}
