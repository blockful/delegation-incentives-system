import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api } from "./api";

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    staleTime: 30_000,
  });
}

export function useActiveDelegates() {
  return useQuery({
    queryKey: ["delegates", "active"],
    queryFn: api.getActiveDelegates,
    staleTime: 60_000,
  });
}

export function useEligibility(address?: string) {
  return useQuery({
    queryKey: ["eligibility", address],
    queryFn: () => api.getEligibility(address!),
    enabled: !!address,
  });
}

export function useTierProgression() {
  return useQuery({
    queryKey: ["tiers", "progression"],
    queryFn: api.getTierProgression,
    staleTime: 60_000,
  });
}

export function useApy(address?: string) {
  return useQuery({
    queryKey: ["apy", address],
    queryFn: () => api.getApy(address!),
    enabled: !!address,
  });
}

export function useDistribution(month: string) {
  return useQuery({
    queryKey: ["distribution", month],
    queryFn: () => api.getDistribution(month),
    staleTime: 300_000,
  });
}

// Convenience hooks using connected wallet address
export function useMyEligibility() {
  const { address } = useAccount();
  return useEligibility(address);
}

export function useMyApy() {
  const { address } = useAccount();
  return useApy(address);
}
