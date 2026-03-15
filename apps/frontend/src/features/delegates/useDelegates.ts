import { useCallback } from 'react'
import { api } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'
import type { DelegateDetail } from '@/api/types'

function toDelegateDetail(address: string): DelegateDetail {
  return {
    address,
    ensName: null,
    votingPower: null,
    delegatorCount: null,
    activeSince: null,
    last10ProposalsVoted: null,
  }
}

export function useDelegates() {
  const fetchDelegates = useCallback(() => api.activeDelegates(), [])
  const { data, loading, error } = useAsync(fetchDelegates)

  return {
    loading,
    error,
    data: data ? data.delegates.map(toDelegateDetail) : null,
    count: data?.count ?? 0,
  }
}
