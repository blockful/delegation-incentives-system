import { useCallback } from 'react'
import styled from 'styled-components'
import { Spinner, Tag, Heading as ThorinHeading, Typography } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useRounds } from '@/features/rounds/useRounds'
import { TierTable } from './components/TierTable'
import { RoundCard } from './components/RoundCard'
import {
  RoundHistoryTable,
  type RoundHistoryEntry,
} from './components/RoundHistoryTable'

const Page = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`

const ErrorMessage = styled.p`
  text-align: center;
  padding: 40px 20px;
  color: #c62828;
  font-size: 16px;
`

// Hardcoded mock data — needs API wiring when round history endpoint is available.
const ROUND_HISTORY: RoundHistoryEntry[] = [
  { round: 4, dates: 'Mar 1 – Mar 31', earned: '0.0000', status: 'live' },
  { round: 3, dates: 'Feb 1 – Feb 28', earned: '12.3456', status: 'paid' },
  { round: 2, dates: 'Jan 1 – Jan 31', earned: '8.7654', status: 'paid' },
  { round: 1, dates: 'Dec 1 – Dec 31', earned: '5.4321', status: 'paid' },
]

export function RoundsPage() {
  const { data, loading, error } = useRounds()
  const fetchRound = useCallback(() => api.currentRound(), [])
  const round = useAsync(fetchRound)

  if (loading) {
    return (
      <Page>
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <ErrorMessage>Failed to load rounds data: {error}</ErrorMessage>
      </Page>
    )
  }

  if (!data) return null

  const currentTier = data.tiers[data.currentTierIndex]
  const poolSizeEns = currentTier?.poolSizeEns ?? '0'
  const tierLabel = `Tier #${data.currentTierIndex + 1}`

  const roundNumber = round.data?.roundNumber ?? 1
  const percentComplete = round.data?.percentComplete ?? 0
  const startDate = round.data?.startDate
    ? new Date(round.data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const endDate = round.data?.endDate
    ? new Date(round.data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  const daysRemaining = round.data?.daysRemaining ?? 0
  const timeLeft = `${daysRemaining}d left`

  return (
    <Page>
      <div>
        <Typography
          fontVariant="label"
          color="blue"
          weight="bold"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Rounds
        </Typography>
        <HeadingRow>
          <ThorinHeading level="1" responsive style={{ margin: 0 }}>
            Round {roundNumber} is
          </ThorinHeading>
          <Tag colorStyle="greenPrimary">live</Tag>
        </HeadingRow>
        <Typography fontVariant="body" color="textTertiary">
          Incentive rounds run for 30 days. Rewards are distributed at the end
          of each round based on your tier.
        </Typography>
      </div>

      <Grid>
        <LeftColumn>
          <RoundCard
            roundNumber={roundNumber}
            percentComplete={percentComplete}
            startDate={startDate}
            endDate={endDate}
            timeLeft={timeLeft}
            poolSizeEns={poolSizeEns}
            currentTier={tierLabel}
            currentApyPct={data.currentGrowthPct}
          />
          <RoundHistoryTable entries={ROUND_HISTORY} />
        </LeftColumn>
        <TierTable tiers={data.tiers} currentTierIndex={data.currentTierIndex} />
      </Grid>
    </Page>
  )
}
