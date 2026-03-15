import styled from 'styled-components'
import { Card, Tag } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

interface RoundCardProps {
  roundNumber: number
  percentComplete: number
  startDate: string
  endDate: string
  timeLeft: string
  poolSizeEns: string
  currentTier: string
  currentApyPct: string
}

const StyledCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const RoundTitle = styled.h3`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  margin: 0;
  color: ${tokens.color.text};
`

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const ProgressLabel = styled.span`
  font-size: 13px;
  color: ${tokens.color.textMuted};
`

const ProgressBarTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: ${tokens.color.surfaceAlt};
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width ${tokens.transition.slow};
`

const DateRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${tokens.color.textMuted};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${tokens.spacing.md};
`

const StatCard = styled.div`
  background: ${tokens.color.surfaceAlt};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.textMuted};
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

export function RoundCard({
  roundNumber,
  percentComplete,
  startDate,
  endDate,
  timeLeft,
  poolSizeEns,
  currentTier,
  currentApyPct,
}: RoundCardProps) {
  return (
    <StyledCard>
      <Header>
        <RoundTitle>Round {roundNumber}</RoundTitle>
        <Tag colorStyle="greenPrimary">In progress</Tag>
      </Header>

      <ProgressSection>
        <ProgressLabel>
          {percentComplete}% complete · {timeLeft}
        </ProgressLabel>
        <ProgressBarTrack>
          <ProgressBarFill $pct={percentComplete} />
        </ProgressBarTrack>
      </ProgressSection>

      <DateRow>
        <span>{startDate}</span>
        <span>{endDate}</span>
      </DateRow>

      <StatsGrid>
        <StatCard>
          <StatLabel>Pool</StatLabel>
          <StatValue>{poolSizeEns} ENS</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Your Tier</StatLabel>
          <StatValue>{currentTier}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Current APY</StatLabel>
          <StatValue>{currentApyPct}%</StatValue>
        </StatCard>
      </StatsGrid>
    </StyledCard>
  )
}
