import type { Address, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { min, sum } from "./util/bigint-math.js";

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
  if (allocations.length === 0) return [];

  // Mutable working map: address -> current reward (as raw bigint).
  const rewards = new Map<Address, bigint>();
  for (const a of allocations) {
    rewards.set(a.address, a.reward as bigint);
  }

  // Track which addresses are permanently capped.
  const capped = new Set<Address>();

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

  return result;
}
