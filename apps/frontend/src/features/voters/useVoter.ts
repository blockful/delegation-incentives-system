import { useMemo } from 'react'
import { useVoters } from './useVoters'

export function useVoter(address: string) {
  const { data, loading, error } = useVoters()

  const voter = useMemo(() => {
    if (!data) return null
    return data.find(
      (v) => v.address.toLowerCase() === address.toLowerCase()
    ) ?? null
  }, [data, address])

  return { voter, loading, error }
}
