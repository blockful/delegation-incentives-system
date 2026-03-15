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
  const { data, loading, error } = useAsync(fetchTiers)
  const walletState = useWalletState()

  if (loading) {
    return (
      <LoadingWrapper>
        <Spinner />
      </LoadingWrapper>
    )
  }

  if (error || !data) {
    return <ErrorMessage>Failed to load tier data: {error}</ErrorMessage>
  }

  switch (walletState.status) {
    case 'connected':
      return <ConnectedLanding tierData={data} />
    case 'delegated':
      return <DelegatedLanding tierData={data} />
    default:
      return <DisconnectedLanding tierData={data} />
  }
}
