import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useReadContract } from "wagmi";
import type { Address } from "viem";

import { TestQueryProvider } from "@/test/utils";
import { server } from "@/test/mocks/server";
import { readContractResult } from "@/test/mocks/wagmi";

const TEST_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;

const useReadContractMock = vi.mocked(useReadContract);

interface RelayerBalancePayload {
  hasEnoughBalance: boolean;
}

interface RelayerConfigPayload {
  minVotingPower: string;
  maxRelayPerAddressPerDay: number;
}

interface RelayerRateLimitPayload {
  delegation: { remaining: number };
  vote: { remaining: number };
  maxPerDay: number;
  resetsAt: string;
}

interface HandlerState {
  balanceCalls: number;
  configCalls: number;
  rateLimitCalls: number;
  balance: RelayerBalancePayload;
  config: RelayerConfigPayload;
  rateLimit: RelayerRateLimitPayload;
}

function freshState(): HandlerState {
  return {
    balanceCalls: 0,
    configCalls: 0,
    rateLimitCalls: 0,
    balance: { hasEnoughBalance: true },
    config: {
      minVotingPower: "100000000000000000000",
      maxRelayPerAddressPerDay: 5,
    },
    rateLimit: {
      delegation: { remaining: 5 },
      vote: { remaining: 5 },
      maxPerDay: 5,
      resetsAt: "2026-05-20T00:00:00Z",
    },
  };
}

function installRelayerHandlers(state: HandlerState) {
  server.use(
    http.get("/api/gateful/ens/relay/balance", () => {
      state.balanceCalls += 1;
      return HttpResponse.json(state.balance);
    }),
    http.get("/api/gateful/ens/relay/config", () => {
      state.configCalls += 1;
      return HttpResponse.json(state.config);
    }),
    http.get("/api/gateful/ens/relay/rate-limit/:address", () => {
      state.rateLimitCalls += 1;
      return HttpResponse.json(state.rateLimit);
    }),
  );
}

describe("useGaslessRelayer", () => {
  let state: HandlerState;

  beforeEach(() => {
    vi.resetModules();
    state = freshState();
    installRelayerHandlers(state);
    useReadContractMock.mockReset();
    useReadContractMock.mockReturnValue(readContractResult());
  });

  it("no connected address: ineligible and rate-limit/user-balance gates stay closed", async () => {
    const { useGaslessEligibility } = await import("./useGaslessRelayer");

    const { result } = renderHook(() => useGaslessEligibility(undefined), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isEligible: false,
        remaining: null,
        isLoading: false,
      }),
    );

    expect(state.rateLimitCalls).toBe(0);
    expect(useReadContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: { enabled: false } }),
    );
  });

  it("relayer balance false: skips config, rate-limit, and on-chain read", async () => {
    state.balance = { hasEnoughBalance: false };

    const { useGaslessEligibility } = await import("./useGaslessRelayer");

    const { result } = renderHook(() => useGaslessEligibility(TEST_ADDRESS), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isEligible: false,
        remaining: null,
        isLoading: false,
      }),
    );

    expect(state.balanceCalls).toBe(1);
    expect(state.configCalls).toBe(0);
    expect(state.rateLimitCalls).toBe(0);
    expect(useReadContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: { enabled: false } }),
    );
  });

  it("rate limited: delegation remaining 0 yields ineligible", async () => {
    state.rateLimit = {
      delegation: { remaining: 0 },
      vote: { remaining: 5 },
      maxPerDay: 5,
      resetsAt: "2026-05-20T00:00:00Z",
    };
    useReadContractMock.mockReturnValue(
      readContractResult({ data: 200n * 10n ** 18n }),
    );

    const { useGaslessEligibility } = await import("./useGaslessRelayer");

    const { result } = renderHook(() => useGaslessEligibility(TEST_ADDRESS), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isEligible: false,
        remaining: 0,
        isLoading: false,
      }),
    );
  });

  it("user balance below min voting power: ineligible", async () => {
    useReadContractMock.mockReturnValue(
      readContractResult({ data: 50n * 10n ** 18n }),
    );

    const { useGaslessEligibility } = await import("./useGaslessRelayer");

    const { result } = renderHook(() => useGaslessEligibility(TEST_ADDRESS), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isEligible: false,
        remaining: 5,
        isLoading: false,
      }),
    );
  });

  it("all green: balance true, config min met, rate-limit available, on-chain balance sufficient", async () => {
    useReadContractMock.mockReturnValue(
      readContractResult({ data: 200n * 10n ** 18n }),
    );

    const { useGaslessEligibility } = await import("./useGaslessRelayer");

    const { result } = renderHook(() => useGaslessEligibility(TEST_ADDRESS), {
      wrapper: TestQueryProvider,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isEligible: true,
        remaining: 5,
        isLoading: false,
      }),
    );
  });
});
