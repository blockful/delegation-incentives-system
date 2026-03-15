import styled from 'styled-components'
import { Spinner, Tag } from '@ensdomains/thorin'
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

const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3889ff;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Heading = styled.h1`
  font-size: 32px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0;
  line-height: 1.5;
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

// Hardcoded — backend doesn't provide round metadata yet.
const CURRENT_ROUND = 4
const ROUND_START = 'Mar 1, 2026'
const ROUND_END = 'Mar 31, 2026'
const PERCENT_COMPLETE = 48
const TIME_LEFT = '16 days'

// Hardcoded mock data — needs API wiring when round history endpoint is available.
const ROUND_HISTORY: RoundHistoryEntry[] = [
  { round: 4, dates: 'Mar 1 – Mar 31', earned: '0.0000', status: 'live' },
  { round: 3, dates: 'Feb 1 – Feb 28', earned: '12.3456', status: 'paid' },
  { round: 2, dates: 'Jan 1 – Jan 31', earned: '8.7654', status: 'paid' },
  { round: 1, dates: 'Dec 1 – Dec 31', earned: '5.4321', status: 'paid' },
]

export function RoundsPage() {
  const { data, loading, error } = useRounds()

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

  return (
    <Page>
      <div>
        <Label>Rounds</Label>
        <HeadingRow>
          <Heading>Round {CURRENT_ROUND} is</Heading>
          <Tag colorStyle="greenPrimary">live</Tag>
        </HeadingRow>
        <Subtitle>
          Incentive rounds run for 30 days. Rewards are distributed at the end
          of each round based on your tier.
        </Subtitle>
      </div>

      <Grid>
        <LeftColumn>
          <RoundCard
            roundNumber={CURRENT_ROUND}
            percentComplete={PERCENT_COMPLETE}
            startDate={ROUND_START}
            endDate={ROUND_END}
            timeLeft={TIME_LEFT}
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
