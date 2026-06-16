import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { scoreSelection, type MatchScore } from '@ens-dis/domain'
import { api } from '@/api'
import type { VoterDetail } from '@/api'
import { useMySelection } from './useMySelection'

export interface VoterWithMatch extends VoterDetail {
  /** Overlap with the viewer's selection; null when either side hasn't selected. */
  match: MatchScore | null
}

/**
 * Active voters with per-card match resolved CLIENT-SIDE: the backend ships each
 * voter's `words`, and we score them against the viewer's own selection here.
 * `match` is null when the viewer hasn't selected or the delegate hasn't. Sorting
 * is left to the consumer (FE-3).
 */
export function useVotersWithMatch() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['voters', 'active'],
    queryFn: () => api.activeVoters(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  const { words: viewerWords } = useMySelection()

  const voters = useMemo<VoterWithMatch[] | null>(() => {
    const list = data?.voters
    if (!list) return null
    return list.map((v) => ({
      ...v,
      match: viewerWords && v.words ? scoreSelection(viewerWords, v.words) : null,
    }))
  }, [data, viewerWords])

  return {
    voters,
    count: data?.count ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    viewerHasSelected: !!viewerWords,
  }
}
