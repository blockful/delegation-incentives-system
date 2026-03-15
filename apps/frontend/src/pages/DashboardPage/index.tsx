import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, Eyebrow, LoadingWrapper, ErrorMessage } from '@/styles'
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

// Hardcoded — lottery data requires distribution endpoint wiring.
const LOTTERY_POOL_NUMBER = 1
const LOTTERY_ACCUMULATED = '8.00'
const LOTTERY_ODDS = '1 in 3'

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

  const currentTier = tiers.data.tiers[tiers.data.currentTierIndex]
  const poolSizeEns = currentTier?.poolSizeEns ?? '0'
  const delegatedTo = (apy.data.delegatedTo ?? address) as `0x${string}`
  const roundNumber = round.data.roundNumber
  const daysRemaining = round.data.daysRemaining
  const timeLeft = `${daysRemaining}d left`
  const roundEndDate = new Date(round.data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const percentComplete = round.data.percentComplete

  return (
    <Page>
      <Eyebrow>Dashboard</Eyebrow>
      <Grid>
        <EarningsCard
          earnedEns={apy.data.estimatedMonthlyRewardEns}
          apyPct={apy.data.estimatedApyPct}
          tierIndex={tiers.data.currentTierIndex}
          delegatedTo={delegatedTo}
          delegateAvatarUrl={apy.data.delegatedToAvatarUrl ?? undefined}
          roundNumber={roundNumber}
          timeLeft={timeLeft}
          roundStartDate={round.data.startDate}
          roundEndDate={round.data.endDate}
        />
        <RightColumn>
          <RoundDetailsSection
            balanceEns={apy.data.currentBalanceEns}
            roundEnds={timeLeft}
            roundEndDate={roundEndDate}
            poolSizeEns={poolSizeEns}
          />
          <RoundProgressCard
            roundNumber={roundNumber}
            percentComplete={percentComplete}
          />
          <LotteryStatusCard
            poolNumber={LOTTERY_POOL_NUMBER}
            accumulated={LOTTERY_ACCUMULATED}
            odds={LOTTERY_ODDS}
          />
        </RightColumn>
      </Grid>
    </Page>
  )
}
