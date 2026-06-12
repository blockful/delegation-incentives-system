import type {
  Address,
  Wei,
  RewardAllocation,
  VoterRewardProvenance,
} from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistributionDetailed } from "./cap-redistribution.js";
import { VOTER_POOL_BPS, VOTER_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum, formatShareAsPct } from "./util/bigint-math.js";

export interface VoterRewardsResult {
  /** Final capped allocations, sorted by address. */
  readonly allocations: RewardAllocation[];
  /** Per-address allocation provenance keyed by voter address. */
  readonly provenance: Map<Address, VoterRewardProvenance>;
}

/**
 * Allocate 10% of pool to active voters, proportional to their AVP (TWAP VP).
 * Cap at 1% of R per voter.
 *
 * @param voterAVPs - Map of voter address to their AVP (Time-Weighted Average Voting Power)
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for active voters
 */
export function computeVoterRewards(
  voterAVPs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  return computeVoterRewardsDetailed(voterAVPs, poolSize).allocations;
}

/**
 * Same allocation as {@link computeVoterRewards}, but also reports per-voter
 * provenance (AVP, pool share, raw vs final reward, cap status) so the
 * pipeline can persist how each reward was derived.
 */
export function computeVoterRewardsDetailed(
  voterAVPs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): VoterRewardsResult {
  if (voterAVPs.size === 0) {
    return { allocations: [], provenance: new Map() };
  }

  const voterSubPool = wei(applyBps(poolSize, VOTER_POOL_BPS));
  const voterCap = wei(applyBps(poolSize, VOTER_CAP_BPS));

  const avpValues = [...voterAVPs.values()] as bigint[];
  const totalAVP = sum(avpValues);

  if (totalAVP === 0n) {
    return { allocations: [], provenance: new Map() };
  }

  const rawAllocations: RewardAllocation[] = [];
  for (const [address, avp] of voterAVPs) {
    const rawReward = wei(mulDiv(avp, voterSubPool, totalAVP));
    rawAllocations.push({ address, reward: rawReward });
  }

  const { allocations, details } = applyCapRedistributionDetailed(
    rawAllocations,
    voterAVPs,
    voterCap,
    voterSubPool,
  );

  const provenance = new Map<Address, VoterRewardProvenance>();
  for (const [address, detail] of details) {
    const avp = voterAVPs.get(address) ?? wei(0n);
    provenance.set(address, {
      avgVotingPower: avp,
      poolSharePct: formatShareAsPct(avp as bigint, totalAVP),
      rawReward: detail.rawReward,
      capStatus: detail.capStatus,
      redistributionReceived: detail.redistributionReceived,
    });
  }

  return { allocations, provenance };
}
