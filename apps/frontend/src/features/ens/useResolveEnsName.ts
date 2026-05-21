import { useCallback, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { normalize } from 'viem/ens'
import { env } from '@/config/env'
import { MOCK_ENS_TO_ADDRESS } from '@/api/mock'

interface UseResolveEnsName {
  resolve: (name: string) => Promise<`0x${string}` | null>
  isResolving: boolean
}

export function useResolveEnsName(): UseResolveEnsName {
  const publicClient = usePublicClient()
  const [isResolving, setIsResolving] = useState(false)

  const resolve = useCallback(
    async (name: string): Promise<`0x${string}` | null> => {
      const key = name.trim().toLowerCase()
      if (!key) return null
      setIsResolving(true)
      await Promise.resolve()
      try {
        if (env.useMockApi) {
          const hit = MOCK_ENS_TO_ADDRESS[key]
          return (hit as `0x${string}` | undefined) ?? null
        }
        if (!publicClient) return null
        let normalized: string
        try {
          normalized = normalize(key)
        } catch {
          return null
        }
        const result = await publicClient.getEnsAddress({ name: normalized })
        return (result as `0x${string}` | null) ?? null
      } catch {
        return null
      } finally {
        setIsResolving(false)
      }
    },
    [publicClient],
  )

  return { resolve, isResolving }
}
