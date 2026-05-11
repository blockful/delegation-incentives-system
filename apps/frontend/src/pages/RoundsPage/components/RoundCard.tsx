import styled from 'styled-components'
import { tokens } from '@/styles'
import { StatCard } from '@/components/shared/StatCard'
import { formatEnsAmount } from '@/utils/format'
import type { RoundStatus } from '@/api/types'

interface RoundCardProps {
  roundNumber: number
  status: RoundStatus
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
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const RoundTitle = styled.h3`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0;
`

const StatusTag = styled.span<{ $status: RoundStatus }>`
  display: inline-flex;
  align-items: center;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.lightBlueOpacity
      : $status === 'paid'
        ? tokens.color.tierHighlight
        : tokens.color.borderLight};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.blue
      : $status === 'paid'
        ? tokens.color.positiveEmphasis
        : tokens.color.darkGray};
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
  width: ${({ $pct }) => $pct}%;
  transition: width ${tokens.transition.slow};
`

const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${tokens.spacing.md};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  > * {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`

function clampPercent(percent: number): number {
  return Math.min(Math.max(percent, 0), 100)
}

function statusLabel(status: RoundStatus): string {
  if (status === 'live') return 'In progress'
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  return 'Ended'
}

export function RoundCard({
  roundNumber,
  status,
  percentComplete,
  startDate,
  endDate,
  timeLeft,
  poolSizeEns,
  currentTier,
  currentApyPct,
}: RoundCardProps) {
  const progressPercent = clampPercent(percentComplete)
  const poolDisplay = formatEnsAmount(poolSizeEns, { maximumFractionDigits: 0 })

  return (
    <Card>
      <Header>
        <RoundTitle>Round {roundNumber}</RoundTitle>
        <StatusTag
          $status={status}
          role="status"
          aria-live="polite"
          aria-label={`Round ${roundNumber} is ${statusLabel(status)}`}
        >
          {statusLabel(status)}
        </StatusTag>
      </Header>

      <ProgressSection>
        <ProgressBarTrack
          role="progressbar"
          aria-label={`Round ${roundNumber} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
        >
          <ProgressBarFill $pct={progressPercent} aria-hidden="true" />
        </ProgressBarTrack>
        <ProgressMeta>
          <span>{startDate}</span>
          <span>{timeLeft} left · ends {endDate}</span>
        </ProgressMeta>
      </ProgressSection>

      <StatsGrid>
        <StatCard label="Pool" value={`${poolDisplay} ENS`} />
        <StatCard label="Current Round Tier" value={currentTier} />
        <StatCard
          label="Current APY"
          value={`${currentApyPct}%`}
          valueColor={tokens.color.positiveEmphasis}
        />
      </StatsGrid>
    </Card>
  )
}
