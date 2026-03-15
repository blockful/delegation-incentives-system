import styled from 'styled-components'
import { Tag } from '@ensdomains/thorin'

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
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: ${({ theme }) => theme.colors.background};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const RoundTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ProgressLabel = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ProgressBarTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  background: #3889FF;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.3s ease;
`

const DateRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`

const StatCard = styled.div`
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StatValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
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
        <Tag colorStyle="greenPrimary">In progress</Tag>
      </Header>

      <ProgressSection>
        <ProgressLabel>
          {percentComplete}% complete · {timeLeft} left
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
    </Card>
  )
}
