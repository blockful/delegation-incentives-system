import styled from 'styled-components'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { formatShortDate, formatPayout } from '@/utils/dashboard'

interface RoundTimelineProps {
  roundNumber: number
  startDate: string
  endDate: string
  daysRemaining: number
  percentComplete: number
  expectedPayout: string
}

const Section = styled.section`
  animation: ${fadeInUp} 0.35s ease 0.05s both;
`

const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: ${tokens.spacing.md};
`

const RoundLabel = styled.h2`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${tokens.color.positive};
  flex-shrink: 0;
`

const DaysLeft = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.textMuted};
`

const TrackWrapper = styled.div`
  position: relative;
  margin-bottom: ${tokens.spacing.sm};
`

const Track = styled.div`
  height: 8px;
  border-radius: 4px;
  background: ${tokens.color.border};
  overflow: hidden;
`

const Fill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, ${tokens.color.accent}, #44B4E0);
  width: ${({ $pct }) => Math.min(Math.max($pct, 1), 100)}%;
  transition: width 0.6s ease;
`

const DateRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textFaint};
`

const PayoutRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: ${tokens.spacing.md};
  padding-top: ${tokens.spacing.md};
  border-top: 1px solid ${tokens.color.border};
`

const PayoutLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const PayoutValue = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positive};
  font-variant-numeric: tabular-nums;
`

export function RoundTimeline({
  roundNumber,
  startDate,
  endDate,
  daysRemaining,
  percentComplete,
  expectedPayout,
}: RoundTimelineProps) {
  return (
    <Section aria-label="Round progress">
      <Header>
        <RoundLabel>
          <LiveDot />
          Round {roundNumber}
        </RoundLabel>
        <DaysLeft>{daysRemaining}d left</DaysLeft>
      </Header>

      <TrackWrapper>
        <Track>
          <Fill $pct={percentComplete} />
        </Track>
      </TrackWrapper>

      <DateRow>
        <span>{formatShortDate(startDate)}</span>
        <span>{formatShortDate(endDate)}</span>
      </DateRow>

      <PayoutRow>
        <PayoutLabel>Expected payout this round</PayoutLabel>
        <PayoutValue>+{formatPayout(expectedPayout)} ENS</PayoutValue>
      </PayoutRow>
    </Section>
  )
}
