import type {
  Address,
  Wei,
  RewardAllocation,
  TokenHolderRewardProvenance,
  TokenHolderSource,
} from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistributionDetailed } from "./cap-redistribution.js";
import { TOKEN_HOLDER_POOL_BPS, TOKEN_HOLDER_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum, formatShareAsPct } from "./util/bigint-math.js";

export interface TokenHolderRewardsResult {
  /** Final capped allocations, sorted by address. */
  readonly allocations: RewardAllocation[];
  /** Per-address allocation provenance keyed by token-holder address. */
  readonly provenance: Map<Address, TokenHolderRewardProvenance>;
}

/**
 * Allocate 90% of pool to eligible token holders, proportional to their TWB.
 * Cap at 5% of R per token holder.
 *
 * @param tokenHolderTWBs - Map of token-holder address to their Time-Weighted Balance
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for token holders
 */
export function computeTokenHolderRewards(
  tokenHolderTWBs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  return computeTokenHolderRewardsDetailed(tokenHolderTWBs, poolSize)
    .allocations;
}

/**
 * Same allocation as {@link computeTokenHolderRewards}, but also reports
 * per-holder provenance (pool share, raw vs final reward, cap status, and
 * holding sources) so the pipeline can persist how each reward was derived.
 *
 * @param tokenHolderSources - Deduplicated holding kinds per consolidated
 *   address (direct / multidelegate / hedgey). Holders missing from the map
 *   report an empty sources list.
 */
export function computeTokenHolderRewardsDetailed(
  tokenHolderTWBs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
  tokenHolderSources: ReadonlyMap<
    Address,
    readonly TokenHolderSource[]
  > = new Map(),
): TokenHolderRewardsResult {
  if (tokenHolderTWBs.size === 0) {
    return { allocations: [], provenance: new Map() };
  }

  const tokenHolderSubPool = wei(applyBps(poolSize, TOKEN_HOLDER_POOL_BPS));
  const tokenHolderCap = wei(applyBps(poolSize, TOKEN_HOLDER_CAP_BPS));

  const twbValues = [...tokenHolderTWBs.values()] as bigint[];
  const totalTWB = sum(twbValues);

  if (totalTWB === 0n) {
    return { allocations: [], provenance: new Map() };
  }

  const rawAllocations: RewardAllocation[] = [];
  for (const [address, twb] of tokenHolderTWBs) {
    const rawReward = wei(mulDiv(twb, tokenHolderSubPool, totalTWB));
    rawAllocations.push({ address, reward: rawReward });
  }

  const { allocations, details } = applyCapRedistributionDetailed(
    rawAllocations,
    tokenHolderTWBs,
    tokenHolderCap,
    tokenHolderSubPool,
  );

  const provenance = new Map<Address, TokenHolderRewardProvenance>();
  for (const [address, detail] of details) {
    const twb = (tokenHolderTWBs.get(address) ?? 0n) as bigint;
    provenance.set(address, {
      poolSharePct: formatShareAsPct(twb, totalTWB),
      rawReward: detail.rawReward,
      capStatus: detail.capStatus,
      redistributionReceived: detail.redistributionReceived,
      sources: tokenHolderSources.get(address) ?? [],
    });
  }

  return { allocations, provenance };
}
