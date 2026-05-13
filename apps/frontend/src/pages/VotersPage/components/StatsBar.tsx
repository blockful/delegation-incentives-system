import styled from 'styled-components'
import { tokens } from '@/styles'
import { formatEnsCompact } from '@/utils/format'

interface StatsBarProps {
  activeVoterCount?: number
  totalDelegatedEns?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.sm};
  background: ${tokens.color.surface};
  overflow: hidden;
  min-width: 0;
`

const Cell = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.xs};
  text-align: center;

  &:not(:last-child) {
    border-right: 1px solid ${tokens.color.borderLight};
  }
`

const CellValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  white-space: nowrap;
`

const CellLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

export function StatsBar({
  activeVoterCount,
  totalDelegatedEns,
  holdersEarning,
}: StatsBarProps) {
  return (
    <Bar>
      <Cell>
        <CellValue>{activeVoterCount ?? '—'}</CellValue>
        <CellLabel>active voters</CellLabel>
      </Cell>
      <Cell>
        <CellValue>{totalDelegatedEns ? formatEnsCompact(totalDelegatedEns) : '—'}</CellValue>
        <CellLabel>ENS delegated</CellLabel>
      </Cell>
      <Cell>
        <CellValue>{holdersEarning ?? '—'}</CellValue>
        <CellLabel>wallets earning</CellLabel>
      </Cell>
    </Bar>
  )
}
