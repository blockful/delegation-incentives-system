import styled from 'styled-components'

interface StatsBarProps {
  activeDelegates: number
  totalDelegated?: string
  holdersEarning?: number
}

const Bar = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
`

const Cell = styled.div`
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:not(:last-child) {
    border-right: 1px solid ${({ theme }) => theme.colors.border};
  }
`

const CellValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const CellLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
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
