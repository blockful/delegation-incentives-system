import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiClientError } from "@/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("api client", () => {
  it("fetches health endpoint", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    const result = await api.health();
    expect(result).toEqual({ status: "ok" });
    expect(mockFetch).toHaveBeenCalledWith("/api/health", undefined);
  });

  it("fetches status endpoint", async () => {
    const body = { activeDelegateCount: 5, proposalCount: 10, cachedDistributions: [] };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));
    const result = await api.status();
    expect(result.activeDelegateCount).toBe(5);
  });

  it("fetches eligibility endpoint with address", async () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ address: addr, eligible: true, isActiveDelegate: false, isDelegatorToActiveDelegate: true, delegatedTo: null }),
    );
    const result = await api.eligibility(addr);
    expect(result.eligible).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(`/api/eligibility/${addr}`, undefined);
  });

  it("fetches tier progression", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ currentTierIndex: 0, tiers: [], currentAVP: "0", previousAVP: "0", currentGrowthBps: "0", currentGrowthPct: "0", activeDelegateCount: 0 }),
    );
    const result = await api.tierProgression();
    expect(result.currentTierIndex).toBe(0);
  });

  it("computes distribution via POST", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ month: "2025-03", totalDistributed: "1000", activeDelegateCount: 3, eligibleDelegatorCount: 10, directPayoutCount: 5, lotteryPoolCount: 1 }),
    );
    const result = await api.computeDistribution("2025-03");
    expect(result.month).toBe("2025-03");
    expect(mockFetch).toHaveBeenCalledWith("/api/distributions/2025-03/compute", { method: "POST" });
  });

  it("throws ApiClientError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Not found" }, 404));
    await expect(api.distribution("2025-01")).rejects.toThrow(ApiClientError);
  });

  it("includes status code in ApiClientError", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Not found" }, 404));
    try {
      await api.distribution("2025-01");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(404);
    }
  });
});
