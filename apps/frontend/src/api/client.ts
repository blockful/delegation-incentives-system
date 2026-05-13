import { env } from '@/config/env'
import type {
  HealthResponse,
  StatusResponse,
  ActiveVotersResponse,
  EligibilityResponse,
  TierProgressionResponse,
  ApyEstimateResponse,
  DistributionResponse,
  RoundInfoResponse,
  RoundListResponse,
  RoundDetailResponse,
  AddressDistributionHistoryResponse,
} from "./types";

const BASE = env.apiBaseUrl;

class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json();
  if (!res.ok) {
    throw new ApiClientError(res.status, body?.error ?? res.statusText);
  }
  return body as T;
}

function withAddress(path: string, address?: string): string {
  return withQuery(path, address ? { address } : undefined);
}

function withQuery(path: string, query?: Record<string, string | undefined>): string {
  if (!query) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  status: () => request<StatusResponse>("/stats"),

  activeVoters: () => request<ActiveVotersResponse>("/voters/active"),

  eligibility: (address: string) =>
    request<EligibilityResponse>(`/eligibility/${address}`),

  tierProgression: () => request<TierProgressionResponse>("/tiers/progression"),

  apy: (address: string) => request<ApyEstimateResponse>(`/apy/${address}`),

  distributionList: () => request<string[]>("/distributions"),

  distribution: (month: string) =>
    request<DistributionResponse>(`/distributions/${month}`),

  distributionsForAddress: (address: string) =>
    request<AddressDistributionHistoryResponse>(withAddress("/distributions", address)),

  currentRound: () => request<RoundInfoResponse>("/rounds/current"),

  rounds: () => request<RoundListResponse>("/rounds"),

  round: (
    roundNumber: number,
    address?: string,
    options?: { rewardLimit?: "all" | `${number}` },
  ) =>
    request<RoundDetailResponse>(withQuery(`/rounds/${roundNumber}`, {
      address,
      rewardLimit: options?.rewardLimit,
    })),
} as const;

export { ApiClientError };
