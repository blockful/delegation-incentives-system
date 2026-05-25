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

// Fetch as a blob and trigger the download from a same-origin `blob:` URL.
// Going via blob avoids two cross-origin quirks of `<a download>` pointing at
// the API host: (1) Chrome silently ignores `download` cross-origin and (2)
// shows a no-drop cursor while processing the click on the synthesized
// draggable anchor. The backend already sends `Content-Disposition: attachment`,
// so the file lands as a download either way — this just cleans up the UX.
async function triggerBrowserDownload(href: string, filename: string): Promise<void> {
  const res = await fetch(href);
  if (!res.ok) {
    throw new ApiClientError(res.status, `Failed to download ${filename}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.draggable = false;
  anchor.click();
  // Defer revoke so the browser has time to capture the blob for the download
  // before the URL is invalidated. Revoking synchronously can race the download
  // pipeline in some browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
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

  downloadDistributionCsv: (month: string): Promise<void> => {
    const href = `${BASE}/distributions/${encodeURIComponent(month)}/csv`;
    return triggerBrowserDownload(href, `distribution-${month}.csv`);
  },
} as const;

export { ApiClientError };
