import { useCallback } from 'react'
import { api } from '@/api'
import { LandingPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { ErrorMessage } from '@/styles'
import { DisconnectedLanding } from './states/DisconnectedLanding'
import { ConnectedLanding } from './states/ConnectedLanding'
import { DelegatedLanding } from './states/DelegatedLanding'

export function LandingPage() {
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)
  const walletState = useWalletState()

  if (tiers.loading || round.loading) {
    return <LandingPageSkeleton />
  }

  if (tiers.error || !tiers.data) {
    return <ErrorMessage>Failed to load tier data: {tiers.error}</ErrorMessage>
  }

  if (round.error || !round.data) {
    return <ErrorMessage>Failed to load current round data: {round.error}</ErrorMessage>
  }

  switch (walletState.status) {
    case 'connected':
      return <ConnectedLanding tierData={tiers.data} roundData={round.data} />
    case 'delegated':
      return <DelegatedLanding tierData={tiers.data} roundData={round.data} />
    default:
      return <DisconnectedLanding tierData={tiers.data} roundData={round.data} />
  }
}
