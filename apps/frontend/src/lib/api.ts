import { API_BASE_URL } from "./constants";
import type {
  StatusResponse,
  ActiveDelegatesResponse,
  EligibilityResponse,
  TierProgressionResponse,
  ApyEstimateResponse,
  DistributionResponse,
} from "@/types/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `API error: ${res.status}`,
    );
  }
  return res.json();
}

export const api = {
  getStatus: () => fetchJson<StatusResponse>("/status"),

  getActiveDelegates: () =>
    fetchJson<ActiveDelegatesResponse>("/delegates/active"),

  getEligibility: (address: string) =>
    fetchJson<EligibilityResponse>(`/eligibility/${address}`),

  getTierProgression: () =>
    fetchJson<TierProgressionResponse>("/tiers/progression"),

  getApy: (address: string) =>
    fetchJson<ApyEstimateResponse>(`/apy/${address}`),

  getDistribution: (month: string) =>
    fetchJson<DistributionResponse>(`/distributions/${month}`),
};
