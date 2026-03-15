import styled from 'styled-components'
import { Card } from '@ensdomains/thorin'

interface RoundDetailsSectionProps {
  balanceEns: string
  roundEnds: string
  roundEndDate: string
  poolSizeEns: string
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`

const StatCard = styled(Card)`
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
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const StatHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

export function RoundDetailsSection({
  balanceEns,
  roundEnds,
  roundEndDate,
  poolSizeEns,
}: RoundDetailsSectionProps) {
  return (
    <Grid>
      <StatCard>
        <StatLabel>Balance</StatLabel>
        <StatValue>{balanceEns} ENS</StatValue>
        <StatHint>180-day avg</StatHint>
      </StatCard>
      <StatCard>
        <StatLabel>Round Ends</StatLabel>
        <StatValue>{roundEnds}</StatValue>
        <StatHint>{roundEndDate}</StatHint>
      </StatCard>
      <StatCard>
        <StatLabel>Pool</StatLabel>
        <StatValue>{poolSizeEns} ENS</StatValue>
      </StatCard>
    </Grid>
  )
}
