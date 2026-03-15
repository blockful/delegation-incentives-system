import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface RoundDetailsSectionProps {
  balanceEns: string
  roundEnds: string
  roundEndDate: string
  poolSizeEns: string
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
  color: ${tokens.color.darkBlue};
`

const StatHint = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textFaint};
`

export function RoundDetailsSection({
  balanceEns,
  roundEnds,
  roundEndDate,
  poolSizeEns,
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
        <StatLabel>Pool</StatLabel>
        <StatValue>{poolSizeEns} ENS</StatValue>
      </StatCell>
    </Grid>
  )
}
