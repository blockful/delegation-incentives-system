import type { Address, Wei, CombinedReward, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { MIN_REWARD_THRESHOLD } from "./config.js";

// ──────────────────────────────────────────────────────────
// Steps 12-13: Combine rewards and apply threshold
// ──────────────────────────────────────────────────────────

/**
 * Combine voter and token-holder rewards per address.
 * An address may appear in one or both pools.
 */
export function combineRewards(
  voterRewards: readonly RewardAllocation[],
  tokenHolderRewards: readonly RewardAllocation[],
): CombinedReward[] {
  const map = new Map<
    Address,
    { voterReward: bigint; tokenHolderReward: bigint }
  >();

  for (const r of voterRewards) {
    const existing = map.get(r.address);
    if (existing) {
      existing.voterReward += r.reward as bigint;
    } else {
      map.set(r.address, {
        voterReward: r.reward as bigint,
        tokenHolderReward: 0n,
      });
    }
  }

  for (const r of tokenHolderRewards) {
    const existing = map.get(r.address);
    if (existing) {
      existing.tokenHolderReward += r.reward as bigint;
    } else {
      map.set(r.address, {
        voterReward: 0n,
        tokenHolderReward: r.reward as bigint,
      });
    }
  }

  const results: CombinedReward[] = [];
  for (const [address, { voterReward, tokenHolderReward }] of map) {
    results.push({
      address,
      voterReward: wei(voterReward),
      tokenHolderReward: wei(tokenHolderReward),
      total: wei(voterReward + tokenHolderReward),
    });
  }

  return results;
}

/**
 * Split combined rewards into direct payouts (>= MIN_REWARD_THRESHOLD) and
 * lottery entries (< MIN_REWARD_THRESHOLD).
 */
export function applyMinimumThreshold(
  combined: readonly CombinedReward[],
): {
  directPayouts: CombinedReward[];
  lotteryEntries: { address: Address; amount: Wei }[];
} {
  const directPayouts: CombinedReward[] = [];
  const lotteryEntries: { address: Address; amount: Wei }[] = [];

  for (const r of combined) {
    if ((r.total as bigint) >= (MIN_REWARD_THRESHOLD as bigint)) {
      directPayouts.push(r);
    } else {
      lotteryEntries.push({ address: r.address, amount: r.total });
    }
  }

  return { directPayouts, lotteryEntries };
}
