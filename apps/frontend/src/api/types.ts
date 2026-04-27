/**
 * API response types derived from the backend OpenAPI schema.
 * Regenerate via `pnpm --filter @ens-dis/frontend codegen` after backend schema changes.
 */
import type { paths } from "./schema.gen";

type GetJson<P extends keyof paths, S extends number = 200> =
  paths[P] extends { get: { responses: infer R } }
    ? R extends Record<S, { content: { "application/json": infer J } }>
      ? J
      : never
    : never;

// /health is reserved by Ponder and not declared in our OpenAPI spec.
export interface HealthResponse {
  status: "ok";
}
export type StatusResponse = GetJson<"/stats">;
export type ActiveDelegatesResponse = GetJson<"/delegates/active">;
export type EligibilityResponse = GetJson<"/eligibility/{address}">;
export type TierProgressionResponse = GetJson<"/tiers/progression">;
export type ApyEstimateResponse = GetJson<"/apy/{address}">;
export type RoundInfoResponse = GetJson<"/rounds/current">;

export type DelegateDetail = ActiveDelegatesResponse["delegates"][number];
export type TierEntry = TierProgressionResponse["tiers"][number];

/**
 * Distribution endpoint returns an opaque object in the schema (passthrough),
 * so we keep the curated response shape declared here.
 */
export interface Payout {
  address: string;
  ensName: string | null;
  amount: string;
  amountEns: string;
  role: "delegate" | "delegator";
}

export interface LotteryEntry {
  address: string;
  ensName: string | null;
  originalAmount: string;
  role: "delegate" | "delegator";
}

export interface LotteryPool {
  totalPrize: string;
  totalPrizeEns: string;
  winner: string;
  winnerEnsName: string | null;
  entries: LotteryEntry[];
}

export interface DistributionMetadata {
  totalDistributed: string;
  totalDistributedEns: string;
  poolTier: {
    momGrowthMinBps: string;
    momGrowthMaxBps: string;
    poolSize: string;
    delegateCap: string;
    delegatorCap: string;
  };
  momGrowthBps: string;
  activeDelegateCount: number;
  eligibleDelegatorCount: number;
  computedAt: string;
  randaoSeed: string;
}

export interface DistributionResponse {
  month: string;
  metadata: DistributionMetadata;
  directPayouts: Payout[];
  lotteryPools: LotteryPool[];
}

export interface ApiError {
  error: string;
}
