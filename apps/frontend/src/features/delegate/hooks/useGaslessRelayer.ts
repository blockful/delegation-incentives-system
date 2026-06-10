import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { formatUnits, zeroAddress, type Address } from "viem";

import { FRONTEND_CLIENT_SOURCE, RELAYER_BASE_URL } from "../relayerClient";

const ENS_TOKEN_ADDRESS =
  "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72" as const;
const ENS_TOKEN_DECIMALS = 18;

/**
 * Copy fallback for the gas-sponsorship minimum (in whole ENS) used when the
 * relayer config hasn't loaded (or the relayer is unfunded). Keep in sync with
 * the relayer's `minVotingPower` config.
 */
export const DEFAULT_GAS_SPONSORSHIP_MIN_ENS = "100";

const ENS_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const BALANCE_PATH = `${RELAYER_BASE_URL}/api/gateful/ens/relay/balance`;
const CONFIG_PATH = `${RELAYER_BASE_URL}/api/gateful/ens/relay/config`;
const rateLimitPath = (address: string) =>
  `${RELAYER_BASE_URL}/api/gateful/ens/relay/rate-limit/${address}`;

interface RelayerBalanceResponse {
  hasEnoughBalance: boolean;
}

interface RelayerConfigResponse {
  minVotingPower: string;
  maxRelayPerAddressPerDay: number;
}

interface RelayerRateLimitResponse {
  delegation: { remaining: number };
  vote: { remaining: number };
  maxPerDay: number;
  resetsAt: string;
}

async function fetchRelayer<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { "x-client-source": FRONTEND_CLIENT_SOURCE },
  });
  if (!res.ok) throw new Error(`relayer ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

interface UseRelayerBalanceResult {
  hasEnoughBalance: boolean | null;
  isLoading: boolean;
}

export const useRelayerBalance = (): UseRelayerBalanceResult => {
  const { data, isLoading } = useQuery({
    queryKey: ["relayer", "balance"],
    queryFn: () => fetchRelayer<RelayerBalanceResponse>(BALANCE_PATH),
  });

  return {
    hasEnoughBalance: data?.hasEnoughBalance ?? null,
    isLoading,
  };
};

interface UseRelayerConfigResult {
  minVotingPower: bigint | null;
  maxRelayPerAddressPerDay: number | null;
  isLoading: boolean;
}

export const useRelayerConfig = (): UseRelayerConfigResult => {
  const { hasEnoughBalance, isLoading: balanceLoading } = useRelayerBalance();
  const enabled = hasEnoughBalance === true;

  const { data, isLoading } = useQuery({
    queryKey: ["relayer", "config"],
    queryFn: () => fetchRelayer<RelayerConfigResponse>(CONFIG_PATH),
    enabled,
  });

  const minVotingPower = useMemo(() => {
    if (!data?.minVotingPower) return null;
    try {
      return BigInt(data.minVotingPower);
    } catch {
      return null;
    }
  }, [data?.minVotingPower]);

  return {
    minVotingPower,
    maxRelayPerAddressPerDay: data?.maxRelayPerAddressPerDay ?? null,
    isLoading: balanceLoading || (enabled && isLoading),
  };
};

/**
 * Display string (whole ENS units) for the minimum ENS balance required to
 * qualify for sponsored gas. Reads the relayer's dynamic `minVotingPower`
 * config and falls back to {@link DEFAULT_GAS_SPONSORSHIP_MIN_ENS} while it
 * loads or when the relayer is unavailable. Copy-only — the actual gas
 * eligibility check lives in {@link useGaslessEligibility}.
 */
export const useGasSponsorshipMinEns = (): string => {
  const { minVotingPower } = useRelayerConfig();

  return useMemo(() => {
    if (minVotingPower === null || minVotingPower <= 0n) {
      return DEFAULT_GAS_SPONSORSHIP_MIN_ENS;
    }
    return formatUnits(minVotingPower, ENS_TOKEN_DECIMALS);
  }, [minVotingPower]);
};

interface UseGaslessEligibilityResult {
  isEligible: boolean;
  remaining: number | null;
  isLoading: boolean;
}

export const useGaslessEligibility = (
  address: Address | undefined,
): UseGaslessEligibilityResult => {
  const { hasEnoughBalance, isLoading: balanceLoading } = useRelayerBalance();
  const { minVotingPower, isLoading: configLoading } = useRelayerConfig();

  const queryEnabled = !!address && hasEnoughBalance === true;

  const targetAddress = address ?? zeroAddress;

  const { data: rateLimitData, isLoading: rateLimitLoading } = useQuery({
    queryKey: ["relayer", "rate-limit", address?.toLowerCase() ?? null],
    queryFn: () =>
      fetchRelayer<RelayerRateLimitResponse>(rateLimitPath(targetAddress)),
    enabled: queryEnabled,
  });

  const delegationRemaining = rateLimitData?.delegation.remaining ?? null;

  const { data: userBalanceData, isLoading: userBalanceLoading } =
    useReadContract({
      address: ENS_TOKEN_ADDRESS,
      abi: ENS_TOKEN_ABI,
      functionName: "balanceOf",
      args: [targetAddress],
      query: { enabled: queryEnabled },
    });

  const userBalance = userBalanceData ?? null;

  const isLoading =
    !!address &&
    (balanceLoading ||
      (hasEnoughBalance === true &&
        (configLoading || rateLimitLoading || userBalanceLoading)));

  const isEligible =
    !isLoading &&
    hasEnoughBalance === true &&
    userBalance !== null &&
    minVotingPower !== null &&
    userBalance >= minVotingPower &&
    delegationRemaining !== null &&
    delegationRemaining > 0;

  return { isEligible, remaining: delegationRemaining, isLoading };
};
