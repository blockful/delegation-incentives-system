import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, Eyebrow, LoadingWrapper, ErrorMessage } from '@/styles'
import { EarningsCard } from './sections/EarningsCard'
import { RoundDetailsSection } from './sections/RoundDetailsSection'
import { RoundProgressCard } from './sections/RoundProgressCard'
import { LotteryStatusCard } from './sections/LotteryStatusCard'

const Page = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['5xl']} ${tokens.spacing.xl};
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.xl};

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

export function DashboardPage() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  return <DashboardContent address={wallet.address} />
}

function formatBalanceWhole(balanceEns: string): string {
  const num = parseFloat(balanceEns)
  if (isNaN(num)) return '0'
  return Math.round(num).toLocaleString('en-US')
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
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
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
  const currentTier = tiers.data.tiers[currentTierIndex]
  const nextTier = tiers.data.tiers[currentTierIndex + 1]
  const delegatedTo = (apy.data.delegatedTo ?? address) as `0x${string}`
  const delegateEnsName = apy.data.delegatedToEnsName ?? undefined
  const roundNumber = round.data.roundNumber
  const daysRemaining = round.data.daysRemaining
  const timeLeft = `${daysRemaining}d left`
  const roundEndDate = new Date(round.data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const percentComplete = round.data.percentComplete

  // Determine if user qualifies for lottery (reward < 1 ENS)
  const estimatedReward = parseFloat(apy.data.estimatedMonthlyRewardEns)
  const qualifiesForLottery = estimatedReward > 0 && estimatedReward < 1

  return (
    <Page>
      <Eyebrow>Dashboard</Eyebrow>
      <Grid>
        <EarningsCard
          earnedEns={apy.data.estimatedMonthlyRewardEns}
          apyPct={apy.data.estimatedApyPct}
          tierIndex={currentTierIndex}
          delegatedTo={delegatedTo}
          delegateEnsName={delegateEnsName}
          delegateAvatarUrl={apy.data.delegatedToAvatarUrl ?? undefined}
          roundNumber={roundNumber}
          timeLeft={timeLeft}
          roundStartDate={round.data.startDate}
          roundEndDate={round.data.endDate}
        />
        <RightColumn>
          <RoundDetailsSection
            balanceEns={formatBalanceWhole(apy.data.currentBalanceEns)}
            roundEnds={timeLeft}
            roundEndDate={roundEndDate}
            nextTierApyPct={nextTier?.estimatedApyPct}
            nextTierVpNeeded={nextTier?.additionalVPNeeded}
            currentTierIndex={currentTierIndex}
            totalTiers={tiers.data.tiers.length}
          />
          <RoundProgressCard
            roundNumber={roundNumber}
            percentComplete={percentComplete}
          />
          <LotteryStatusCard qualifies={qualifiesForLottery} />
        </RightColumn>
      </Grid>
    </Page>
  )
}
