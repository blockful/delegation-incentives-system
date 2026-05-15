import styled from 'styled-components'
import { tokens } from '@/styles'
import { formatEnsCompact } from '@/utils/format'

interface StatsBarProps {
  totalDelegatedEns?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.md} ${tokens.spacing.xl};
  min-width: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;

  @media (min-width: 768px) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${tokens.spacing.lg};
  }
`

const StatItem = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: ${tokens.spacing.xs};
  min-width: 0;
  position: relative;

  @media (min-width: 768px) {
    &:not(:last-child) {
      padding-right: ${tokens.spacing.lg};
      border-right: 1px solid ${tokens.color.borderLight};
    }
  }
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  font-family: ${tokens.font.mono};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export function StatsBar({
  totalDelegatedEns,
  holdersEarning,
}: StatsBarProps) {
  return (
    <Bar>
      <StatItem>
        <StatLabel>ENS delegated:</StatLabel>
        <StatValue>{totalDelegatedEns ? formatEnsCompact(totalDelegatedEns) : '—'}</StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>wallets earning:</StatLabel>
        <StatValue>{holdersEarning ?? '—'}</StatValue>
      </StatItem>
    </Bar>
  )
}
