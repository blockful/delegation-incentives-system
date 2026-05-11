import { useMemo } from 'react'
import { useDelegates } from './useDelegates'

export function useDelegate(address: string) {
  const { data, loading, error } = useDelegates()

  const delegate = useMemo(() => {
    if (!data) return null
    return data.find(
      (d) => d.address.toLowerCase() === address.toLowerCase()
    ) ?? null
  }, [data, address])

  return { delegate, loading, error }
}
