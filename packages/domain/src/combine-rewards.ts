import type {
  Address,
  Wei,
  CombinedReward,
  RewardAllocation,
  TokenHolderRewardProvenance,
  VoterRewardProvenance,
} from "./types.js";
import { wei } from "./types.js";
import { MIN_REWARD_THRESHOLD } from "./config.js";

// ──────────────────────────────────────────────────────────
// Steps 12-13: Combine rewards and apply threshold
// ──────────────────────────────────────────────────────────

/**
 * Combine voter and token-holder rewards per address.
 * An address may appear in one or both pools.
 *
 * `tokenHolderBalances` is the per-address time-weighted balance map produced
 * during token-holder reward allocation. It is persisted on the output so the
 * frontend can show the *actual* tokens delegated during the round, not a
 * current-state VP snapshot.
 *
 * `voterProvenance` / `tokenHolderProvenance` carry per-role allocation
 * intermediates (raw reward, pool share, cap status); when provided they are
 * attached per address so result_json can explain each final reward.
 */
export function combineRewards(
  voterRewards: readonly RewardAllocation[],
  tokenHolderRewards: readonly RewardAllocation[],
  tokenHolderBalances: ReadonlyMap<Address, Wei> = new Map(),
  voterProvenance: ReadonlyMap<Address, VoterRewardProvenance> = new Map(),
  tokenHolderProvenance: ReadonlyMap<
    Address,
    TokenHolderRewardProvenance
  > = new Map(),
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
    const balance = tokenHolderBalances.get(address) ?? wei(0n);
    const voterProv = voterProvenance.get(address);
    const tokenHolderProv = tokenHolderProvenance.get(address);
    results.push({
      address,
      voterReward: wei(voterReward),
      tokenHolderReward: wei(tokenHolderReward),
      tokenHolderBalance: balance,
      total: wei(voterReward + tokenHolderReward),
      ...(voterProv !== undefined && { voterProvenance: voterProv }),
      ...(tokenHolderProv !== undefined && {
        tokenHolderProvenance: tokenHolderProv,
      }),
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
