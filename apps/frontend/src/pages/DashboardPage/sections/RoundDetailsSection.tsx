import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface RoundDetailsSectionProps {
  balanceEns: string
  roundEnds: string
  roundEndDate: string
  expectedPayout: string
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

const StatCell = styled.div`
  background: ${tokens.color.surface};
  padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.textMuted};
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const PayoutValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positive};
`

const StatHint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textFaint};
`

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  if (num < 0.01) return '<0.01'
  if (num < 1) return num.toFixed(2)
  return num.toFixed(2)
}

export function RoundDetailsSection({
  balanceEns,
  roundEnds,
  roundEndDate,
  expectedPayout,
}: RoundDetailsSectionProps) {
  return (
    <Grid>
      <StatCell>
        <StatLabel>Balance</StatLabel>
        <StatValue>{balanceEns} ENS</StatValue>
        <StatHint>180-day avg</StatHint>
      </StatCell>
      <StatCell>
        <StatLabel>Round Ends</StatLabel>
        <StatValue>{roundEnds}</StatValue>
        <StatHint>{roundEndDate}</StatHint>
      </StatCell>
      <StatCell>
        <StatLabel>Payout</StatLabel>
        <PayoutValue>+{formatPayout(expectedPayout)}</PayoutValue>
        <StatHint>ENS this round</StatHint>
      </StatCell>
    </Grid>
  )
}
