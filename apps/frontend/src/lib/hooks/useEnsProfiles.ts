"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface EnsProfile {
  address: string;
  name: string | null;
  avatar: string | null;
}

async function resolveProfile(address: `0x${string}`): Promise<EnsProfile> {
  try {
    const name = await client.getEnsName({ address });
    let avatar: string | null = null;
    if (name) {
      try {
        avatar = await client.getEnsAvatar({ name: normalize(name) });
      } catch {
        // avatar resolution can fail silently
      }
    }
    return { address, name, avatar };
  } catch {
    return { address, name: null, avatar: null };
  }
}

export function useEnsProfiles(addresses: string[]) {
  return useQuery({
    queryKey: ["ens-profiles", addresses.sort().join(",")],
    queryFn: async () => {
      const profiles = await Promise.allSettled(
        addresses.map((addr) => resolveProfile(addr as `0x${string}`)),
      );
      const map = new Map<string, EnsProfile>();
      for (const result of profiles) {
        if (result.status === "fulfilled") {
          map.set(result.value.address.toLowerCase(), result.value);
        }
      }
      return map;
    },
    enabled: addresses.length > 0,
    staleTime: 300_000,
  });
}
