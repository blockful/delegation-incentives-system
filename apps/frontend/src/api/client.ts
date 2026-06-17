import { env } from '@/config/env'
import type {
  HealthResponse,
  StatusResponse,
  ActiveVotersResponse,
  EligibilityResponse,
  TierProgressionResponse,
  AprEstimateResponse,
  DistributionResponse,
  RoundInfoResponse,
  RoundListResponse,
  RoundDetailResponse,
  AddressDistributionHistoryResponse,
  WordPoolResponse,
  SelectionResponse,
  MatchCountResponse,
  PutSelectionBody,
  PutSelectionResponse,
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

function triggerBrowserDownload(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  status: () => request<StatusResponse>("/stats"),

  activeVoters: () => request<ActiveVotersResponse>("/voters/active"),

  eligibility: (address: string) =>
    request<EligibilityResponse>(`/eligibility/${address}`),

  tierProgression: () => request<TierProgressionResponse>("/tiers/progression"),

  apr: (address: string) => request<AprEstimateResponse>(`/apr/${address}`),

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

  wordPool: () => request<WordPoolResponse>("/selections/word-pool"),

  selection: (address: string) =>
    request<SelectionResponse>(`/selections/${address}`),

  matchCount: (address: string) =>
    request<MatchCountResponse>(`/selections/${address}/match-count`),

  putSelection: (address: string, body: PutSelectionBody) =>
    request<PutSelectionResponse>(`/selections/${address}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),

  downloadDistributionCsv: (month: string): void => {
    const href = `${BASE}/distributions/${encodeURIComponent(month)}/csv`;
    triggerBrowserDownload(href, `distribution-${month}.csv`);
  },
} as const;

export { ApiClientError };
