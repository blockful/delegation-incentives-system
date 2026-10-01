import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import type { RoundListResponse, RoundSummary } from '@/api/types'

const SETTLED_STATUSES = new Set<RoundSummary['status']>(['paid', 'ended'])

/**
 * True once the program has no live or upcoming round left: the backend
 * reports no current round and every round is settled and past its end date.
 * An empty list is not "ended" (nothing has run yet).
 */
export function isProgramEnded(
  roundList: RoundListResponse | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!roundList || roundList.currentRoundNumber !== null) return false
  const { rounds } = roundList
  if (rounds.length === 0) return false
  return rounds.every(
    (r) => SETTLED_STATUSES.has(r.status) && new Date(r.endDate).getTime() < now,
  )
}

/**
 * Resolve the ended flag: an explicit backend `programEnded` wins. Backends
 * deployed before that field existed omit it (despite the generated type
 * marking it required), so fall back to deriving it from `/rounds`.
 */
export function resolveProgramEnded(
  explicit: boolean | null | undefined,
  roundList: RoundListResponse | null | undefined,
): boolean {
  return explicit ?? isProgramEnded(roundList)
}

export interface PilotSummary {
  roundCount: number
  totalDistributedEns: number
  /** Settled tier of the last round (0-based), or null when unknown. */
  finalTierIndex: number | null
}

export function summarizePilot(rounds: RoundSummary[]): PilotSummary {
  const settled = rounds.filter((r) => SETTLED_STATUSES.has(r.status))
  const totalDistributedEns = settled.reduce((sum, r) => {
    const n = Number(r.totalDistributedEns ?? '0')
    return Number.isFinite(n) ? sum + n : sum
  }, 0)
  const last = settled.reduce<RoundSummary | null>(
    (acc, r) => (!acc || r.roundNumber > acc.roundNumber ? r : acc),
    null,
  )
  return {
    roundCount: settled.length,
    totalDistributedEns,
    finalTierIndex: last?.tierIndex ?? null,
  }
}

/**
 * `/rounds` via react-query so the landing page and dashboard share one fetch.
 * Errors are non-fatal for callers: without the list we simply can't derive
 * the ended state and fall back to the live UI.
 */
export function useRoundList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rounds'],
    queryFn: () => api.rounds(),
    staleTime: 5 * 60_000,
  })
  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
  }
}
