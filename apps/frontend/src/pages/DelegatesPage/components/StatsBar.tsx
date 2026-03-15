import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface StatsBarProps {
  activeDelegates: number
  totalDelegated?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: flex;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  overflow: hidden;
`

const Cell = styled.div`
  flex: 1;
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xs};

  &:not(:last-child) {
    border-right: 1px solid ${tokens.color.border};
  }
`

const CellValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const CellLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  text-transform: uppercase;
`

export function StatsBar({
  activeDelegates,
  totalDelegated,
  holdersEarning,
}: StatsBarProps) {
  return (
    <Bar>
      <Cell>
        <CellValue>{activeDelegates}</CellValue>
        <CellLabel>Active Delegates</CellLabel>
      </Cell>
      <Cell>
        <CellValue>{totalDelegated ?? '—'}</CellValue>
        <CellLabel>ENS Delegated</CellLabel>
      </Cell>
      <Cell>
        <CellValue>{holdersEarning ?? '—'}</CellValue>
        <CellLabel>Holders Earning</CellLabel>
      </Cell>
    </Bar>
  )
}
