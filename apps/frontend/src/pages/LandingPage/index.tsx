import { useCallback } from 'react'
import { Spinner } from '@ensdomains/thorin'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { DisconnectedLanding } from './states/DisconnectedLanding'
import { ConnectedLanding } from './states/ConnectedLanding'
import { DelegatedLanding } from './states/DelegatedLanding'

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`

const ErrorMessage = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`

export function LandingPage() {
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)
  const walletState = useWalletState()

  if (tiers.loading || round.loading) {
    return (
      <LoadingWrapper>
        <Spinner />
      </LoadingWrapper>
    )
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
