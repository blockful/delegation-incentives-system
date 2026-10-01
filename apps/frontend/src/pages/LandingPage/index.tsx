import { useCallback } from 'react'
import { api } from '@/api'
import { LandingPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { resolveProgramEnded, summarizePilot, useRoundList } from '@/features/rounds/programStatus'
import { ErrorMessage } from '@/styles'
import { DisconnectedLanding } from './states/DisconnectedLanding'
import { ConnectedLanding } from './states/ConnectedLanding'
import { DelegatedLanding } from './states/DelegatedLanding'

export function LandingPage() {
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)
  const roundList = useRoundList()
  const walletState = useWalletState()

  if (tiers.loading || round.loading || roundList.loading) {
    return <LandingPageSkeleton />
  }

  if (tiers.error || !tiers.data) {
    return <ErrorMessage>Failed to load tier data: {tiers.error}</ErrorMessage>
  }

  if (round.error || !round.data) {
    return <ErrorMessage>Failed to load current round data: {round.error}</ErrorMessage>
  }

  const programEnded = resolveProgramEnded(
    round.data.programEnded ?? tiers.data.programEnded,
    roundList.data,
  )
  // Null while the program is live; the hero and tier ladder switch to the
  // settled pilot summary once it has ended.
  const pilot = programEnded ? summarizePilot(roundList.data?.rounds ?? []) : null
  const props = { tierData: tiers.data, roundData: round.data, pilot }

  switch (walletState.status) {
    case 'connected':
      return <ConnectedLanding {...props} />
    case 'delegated':
      return <DelegatedLanding {...props} />
    default:
      return <DisconnectedLanding {...props} />
  }
}
