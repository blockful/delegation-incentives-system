import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { EarningsCard } from './sections/EarningsCard'
import { RoundDetailsSection } from './sections/RoundDetailsSection'
import { RoundProgressCard } from './sections/RoundProgressCard'
import { LotteryStatusCard } from './sections/LotteryStatusCard'

const Page = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

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

  // delegatedTo: use apy response or fallback to self
  const delegatedTo = (apy.data.delegatedTo ?? address) as `0x${string}`

  const roundNumber = round.data.roundNumber
  const daysRemaining = round.data.daysRemaining
  const timeLeft = `${daysRemaining}d left`
  const roundEndDate = new Date(round.data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const percentComplete = round.data.percentComplete

  return (
    <Page>
      <Grid>
        <EarningsCard
          earnedEns={apy.data.estimatedMonthlyRewardEns}
          apyPct={apy.data.estimatedApyPct}
          tierIndex={apy.data.currentTierIndex}
          delegatedTo={delegatedTo}
          roundNumber={roundNumber}
          timeLeft={timeLeft}
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
