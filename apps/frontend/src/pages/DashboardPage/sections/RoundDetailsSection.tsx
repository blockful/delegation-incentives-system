import styled from 'styled-components'

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
  background: #E5E5E5;
  border: 1px solid #E5E5E5;
  border-radius: 16px;
  overflow: hidden;
`

const StatCell = styled.div`
  background: #fff;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const StatLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #4A5C63;
`

const StatValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #011A25;
`

const StatHint = styled.span`
  font-size: 12px;
  color: #C4C7C8;
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
