import type {
  HealthResponse,
  StatusResponse,
  ActiveDelegatesResponse,
  EligibilityResponse,
  TierProgressionResponse,
  ApyEstimateResponse,
  DistributionResponse,
  RoundInfoResponse,
} from "./types";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "") + "/api";

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

export const api = {
  health: () => request<HealthResponse>("/health"),

  status: () => request<StatusResponse>("/status"),

  activeDelegates: () => request<ActiveDelegatesResponse>("/delegates/active"),

  eligibility: (address: string) =>
    request<EligibilityResponse>(`/eligibility/${address}`),

  tierProgression: () => request<TierProgressionResponse>("/tiers/progression"),

  apy: (address: string) => request<ApyEstimateResponse>(`/apy/${address}`),

  distributionList: () => request<string[]>("/distributions"),

  distribution: (month: string) =>
    request<DistributionResponse>(`/distributions/${month}`),

  currentRound: () => request<RoundInfoResponse>("/rounds/current"),
} as const;

export { ApiClientError };
