import type { Address, Wei, CombinedReward, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { MIN_PAYOUT } from "./config.js";

// ──────────────────────────────────────────────────────────
// Steps 12-13: Combine rewards and apply threshold
// ──────────────────────────────────────────────────────────

/**
 * Combine delegate and delegator rewards per address.
 * An address may appear in one or both pools.
 */
export function combineRewards(
  delegateRewards: readonly RewardAllocation[],
  delegatorRewards: readonly RewardAllocation[],
): CombinedReward[] {
  const map = new Map<
    Address,
    { delegateReward: bigint; delegatorReward: bigint }
  >();

  for (const r of delegateRewards) {
    const existing = map.get(r.address);
    if (existing) {
      existing.delegateReward += r.reward as bigint;
    } else {
      map.set(r.address, {
        delegateReward: r.reward as bigint,
        delegatorReward: 0n,
      });
    }
  }

  for (const r of delegatorRewards) {
    const existing = map.get(r.address);
    if (existing) {
      existing.delegatorReward += r.reward as bigint;
    } else {
      map.set(r.address, {
        delegateReward: 0n,
        delegatorReward: r.reward as bigint,
      });
    }
  }

  const results: CombinedReward[] = [];
  for (const [address, { delegateReward, delegatorReward }] of map) {
    results.push({
      address,
      delegateReward: wei(delegateReward),
      delegatorReward: wei(delegatorReward),
      total: wei(delegateReward + delegatorReward),
    });
  }

  return results;
}

/**
 * Split combined rewards into direct payouts (>= MIN_PAYOUT) and
 * lottery entries (< MIN_PAYOUT).
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
    if ((r.total as bigint) >= (MIN_PAYOUT as bigint)) {
      directPayouts.push(r);
    } else {
      lotteryEntries.push({ address: r.address, amount: r.total });
    }
  }

  return { directPayouts, lotteryEntries };
}
