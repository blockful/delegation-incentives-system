import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, LoadingWrapper, ErrorMessage } from '@/styles'
import { EarningsHero } from './sections/EarningsHero'
import { StatsRow } from './sections/StatsRow'
import { TierTable } from './sections/TierTable'
import { LotteryBanner } from './sections/LotteryBanner'

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
    gap: ${tokens.spacing.xl};
  }
`

export function DashboardPage() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const fetchApy = useCallback(() => api.apy(address), [address])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const apy = useAsync(fetchApy)
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)

  if (apy.loading || tiers.loading || round.loading) {
    return (
      <Page>
        <LoadingWrapper><Spinner /></LoadingWrapper>
      </Page>
    )
  }

  if (apy.error || tiers.error || round.error) {
    return (
      <Page>
        <ErrorMessage>
          Failed to load dashboard data: {apy.error ?? tiers.error ?? round.error}
        </ErrorMessage>
      </Page>
    )
  }

  if (!apy.data || !tiers.data || !round.data) return null

  const currentTierIndex = tiers.data.currentTierIndex
  const delegatedTo = (apy.data.delegatedTo ?? address) as `0x${string}`

  return (
    <Page>
      <EarningsHero
        earnedEns={apy.data.estimatedMonthlyRewardEns}
        apyPct={apy.data.estimatedApyPct}
        tierIndex={currentTierIndex}
        delegatedTo={delegatedTo}
        delegateEnsName={apy.data.delegatedToEnsName ?? undefined}
        delegateAvatarUrl={apy.data.delegatedToAvatarUrl ?? undefined}
        roundStartDate={round.data.startDate}
        roundEndDate={round.data.endDate}
      />
      <StatsRow
        balanceEns={apy.data.currentBalanceEns}
        expectedPayout={apy.data.estimatedMonthlyRewardEns}
        roundNumber={round.data.roundNumber}
        daysRemaining={round.data.daysRemaining}
        percentComplete={round.data.percentComplete}
      />
      <TierTable
        tiers={tiers.data.tiers}
        currentTierIndex={currentTierIndex}
        userEstimatedReward={apy.data.estimatedMonthlyRewardEns}
      />
      {apy.data.qualifiesForLottery && (
        <LotteryBanner expectedPayout={apy.data.estimatedMonthlyRewardEns} />
      )}
    </Page>
  )
}
