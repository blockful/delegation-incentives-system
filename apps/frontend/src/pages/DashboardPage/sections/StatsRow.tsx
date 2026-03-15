import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface StatsRowProps {
  balanceEns: string
  expectedPayout: string
  roundNumber: number
  daysRemaining: number
  percentComplete: number
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: ${tokens.color.border};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  overflow: hidden;
`

const Cell = styled.div`
  background: ${tokens.color.surface};
  padding: ${tokens.spacing.lg} ${tokens.spacing.md};
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;

  @media (min-width: 768px) {
    padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  }
`

const CellLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.textMuted};
`

const CellValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['2xl']};
  }
`

const CellValueGreen = styled(CellValue)`
  color: ${tokens.color.positive};
`

const CellHint = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textFaint};
`

const ProgressTrack = styled.div`
  height: 3px;
  border-radius: 2px;
  background: ${tokens.color.border};
  margin-top: ${tokens.spacing.xs};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.5s ease;
`

function formatBalance(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num)) return '0'
  return Math.round(num).toLocaleString('en-US')
}

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  if (num < 0.01) return '<0.01'
  if (num >= 10) return num.toFixed(1)
  return num.toFixed(2)
}

export function StatsRow({
  balanceEns,
  expectedPayout,
  roundNumber,
  daysRemaining,
  percentComplete,
}: StatsRowProps) {
  return (
    <Grid>
      <Cell>
        <CellLabel>Balance</CellLabel>
        <CellValue>{formatBalance(balanceEns)}</CellValue>
        <CellHint>180d avg ENS</CellHint>
      </Cell>
      <Cell>
        <CellLabel>Payout</CellLabel>
        <CellValueGreen>+{formatPayout(expectedPayout)}</CellValueGreen>
        <CellHint>ENS this round</CellHint>
      </Cell>
      <Cell>
        <CellLabel>Round {roundNumber}</CellLabel>
        <CellValue>{daysRemaining}d</CellValue>
        <ProgressTrack>
          <ProgressFill $pct={percentComplete} />
        </ProgressTrack>
      </Cell>
    </Grid>
  )
}
