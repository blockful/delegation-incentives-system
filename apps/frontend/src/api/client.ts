import { env } from '@/config/env'
import type {
  HealthResponse,
  StatusResponse,
  ActiveDelegatesResponse,
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
  if (!address) return path;
  const params = new URLSearchParams({ address });
  return `${path}?${params.toString()}`;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  status: () => request<StatusResponse>("/stats"),

  activeDelegates: () => request<ActiveDelegatesResponse>("/delegates/active"),

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

  round: (roundNumber: number, address?: string) =>
    request<RoundDetailResponse>(withAddress(`/rounds/${roundNumber}`, address)),
} as const;

export { ApiClientError };
