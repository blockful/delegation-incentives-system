import styled from 'styled-components'

interface RoundStatusBarProps {
  currentGrowthPct: string
  currentTierIndex: number
  poolSizeEns: string
  roundNumber?: number
  roundTimeLeft?: string
}

const Wrapper = styled.div`
  max-width: 680px;
  margin: -32px auto 0;
  padding: 0 20px;
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    margin-top: -36px;
  }
`

const Bar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(1, 26, 37, 0.08);
  overflow: hidden;
`

const Cell = styled.div`
  padding: 20px 16px;
  text-align: center;

  &:not(:last-child) {
    border-right: 1px solid #E5E5E5;
  }

  @media (min-width: 768px) {
    padding: 24px 20px;
  }
`

const CellValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #011A25;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  @media (min-width: 768px) {
    font-size: 18px;
  }
`

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #007C23;
  flex-shrink: 0;
`

const GrowthValue = styled.span<{ $negative?: boolean }>`
  color: ${({ $negative }) => ($negative ? '#F53293' : '#007C23')};
  font-weight: 700;
`

const CellLabel = styled.div`
  font-size: 12px;
  color: #4A5C63;
  margin-top: 4px;
  letter-spacing: 0.02em;
`

export function RoundStatusBar({
  currentGrowthPct,
  currentTierIndex,
  poolSizeEns,
  roundNumber,
  roundTimeLeft,
}: RoundStatusBarProps) {
  const growthNum = parseFloat(currentGrowthPct)
  const isNegative = growthNum < 0
  const growthPrefix = isNegative ? '' : '+'
  const displayRound = roundNumber ?? 1
  const displayTimeLeft = roundTimeLeft ?? ''

  return (
    <Wrapper>
      <Bar>
        <Cell>
          <CellValue>
            <LiveDot />
            Round {displayRound}
          </CellValue>
          <CellLabel>{displayTimeLeft}</CellLabel>
        </Cell>
        <Cell>
          <CellValue>
            <GrowthValue $negative={isNegative}>
              {growthPrefix}{currentGrowthPct}%
            </GrowthValue>
          </CellValue>
          <CellLabel>VP growth</CellLabel>
        </Cell>
        <Cell>
          <CellValue>Tier {currentTierIndex + 1}</CellValue>
          <CellLabel>{poolSizeEns} ENS pool</CellLabel>
        </Cell>
      </Bar>
    </Wrapper>
  )
}
