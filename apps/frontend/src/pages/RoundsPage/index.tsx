import { useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import { useRounds } from '@/features/rounds/useRounds'
import { tokens, fadeInUp, Eyebrow, PageTitle, LoadingWrapper, ErrorMessage } from '@/styles'
import { TierTable } from './components/TierTable'
import { RoundCard } from './components/RoundCard'
import {
  RoundHistoryTable,
  type RoundHistoryEntry,
} from './components/RoundHistoryTable'

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const RoundsPageTitle = styled(PageTitle)`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const livePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(26, 127, 55, 0.5); }
  60%       { box-shadow: 0 0 0 6px rgba(26, 127, 55, 0); }
`

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.positiveEmphasis};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.black};
  padding: 6px 18px 6px 12px;
  border-radius: ${tokens.radius.md};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const LiveDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${tokens.color.positiveEmphasis};
  flex-shrink: 0;
  animation: ${livePulse} 1.8s ease-in-out infinite;

  @media (min-width: 768px) {
    width: 14px;
    height: 14px;
  }
`

const PageDescription = styled.p`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.darkGray};
  margin: 0;
  line-height: 1.6;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing['3xl']};

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
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
  const timeLeft = `${daysRemaining}d`

  return (
    <Page>
      <HeaderBlock>
        <Eyebrow>Rounds</Eyebrow>
        <HeadingRow>
          <RoundsPageTitle>Round {roundNumber} is</RoundsPageTitle>
          <LiveBadge>
            <LiveDot />
            live
          </LiveBadge>
        </HeadingRow>
        <PageDescription>
          Incentive rounds run for 30 days. Rewards are distributed at the end
          of each round based on your tier.
        </PageDescription>
      </HeaderBlock>

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
            currentApyPct={currentTier?.estimatedApyPct ?? '0'}
          />
          <RoundHistoryTable entries={ROUND_HISTORY} />
        </LeftColumn>
        <TierTable tiers={data.tiers} currentTierIndex={data.currentTierIndex} />
      </Grid>
    </Page>
  )
}
