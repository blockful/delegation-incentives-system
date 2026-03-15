import { useCallback } from 'react'
import { Spinner } from '@ensdomains/thorin'
import styled from 'styled-components'
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
  padding: 64px 20px;
  color: #c62828;
  font-size: 16px;
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

  const roundData = round.data ?? undefined

  switch (walletState.status) {
    case 'connected':
      return <ConnectedLanding tierData={tiers.data} roundData={roundData} />
    case 'delegated':
      return <DelegatedLanding tierData={tiers.data} roundData={roundData} />
    default:
      return <DisconnectedLanding tierData={tiers.data} roundData={roundData} />
  }
}
