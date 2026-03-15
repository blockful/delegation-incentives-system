import { useCallback } from 'react'
import { api } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'

export function useRounds() {
  const fetchTierProgression = useCallback(() => api.tierProgression(), [])
  return useAsync(fetchTierProgression)
}
