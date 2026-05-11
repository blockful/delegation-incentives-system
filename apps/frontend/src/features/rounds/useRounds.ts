import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'

export function useRounds() {
  const fetchTierProgression = useCallback(() => api.tierProgression(), [])
  return useAsync(fetchTierProgression)
}
