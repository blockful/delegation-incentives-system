import styled from 'styled-components'
import { tokens } from '@/styles'
import { StatCard } from '@/components/shared/StatCard'

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

const Card = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.sm};
  padding: ${tokens.spacing['2xl']};
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
  color: ${tokens.color.darkBlue};
  margin: 0;
`

const InProgressTag = styled.span`
  display: inline-flex;
  align-items: center;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
`

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const ProgressBarTrack = styled.div`
  height: 8px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.borderLight};
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.blue};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width ${tokens.transition.slow};
`

const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
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
    <Card>
      <Header>
        <RoundTitle>Round {roundNumber}</RoundTitle>
        <InProgressTag>In progress</InProgressTag>
      </Header>

      <ProgressSection>
        <ProgressBarTrack>
          <ProgressBarFill $pct={percentComplete} />
        </ProgressBarTrack>
        <ProgressMeta>
          <span>{startDate}</span>
          <span>{timeLeft} left · ends {endDate}</span>
        </ProgressMeta>
      </ProgressSection>

      <StatsGrid>
        <StatCard label="Pool" value={`${poolSizeEns} ENS`} />
        <StatCard label="Your Tier" value={currentTier} />
        <StatCard label="Current APY" value={`${currentApyPct}%`} valueColor={tokens.color.positiveEmphasis} />
      </StatsGrid>
    </Card>
  )
}
