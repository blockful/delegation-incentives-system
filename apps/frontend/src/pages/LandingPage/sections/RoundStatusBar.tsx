import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface RoundStatusBarProps {
  currentGrowthPct: string
  currentTierIndex: number
  poolSizeEns: string
  roundNumber?: number
  roundTimeLeft?: string
}

const Wrapper = styled.div`
  max-width: 680px;
  margin: -${tokens.spacing['3xl']} auto 0;
  padding: 0 ${tokens.spacing.xl};
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    margin-top: -36px;
  }
`

const Bar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.lg};
  box-shadow: ${tokens.shadow.md};
  overflow: hidden;
`

const Cell = styled.div`
  padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  text-align: center;

  &:not(:last-child) {
    border-right: 1px solid ${tokens.color.border};
  }

  @media (min-width: 768px) {
    padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  }
`

const CellValue = styled.div`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size.xl};
  }
`

const LiveDot = styled.span`
  width: ${tokens.spacing.sm};
  height: ${tokens.spacing.sm};
  border-radius: 50%;
  background: ${tokens.color.positive};
  flex-shrink: 0;
`

const GrowthValue = styled.span<{ $negative?: boolean }>`
  color: ${({ $negative }) => ($negative ? tokens.color.negative : tokens.color.positive)};
  font-weight: ${tokens.font.weight.bold};
`

const CellLabel = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  margin-top: ${tokens.spacing.xs};
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
  const growthPrefix = isNegative ? '\u2013' : '+'
  const displayGrowth = isNegative ? currentGrowthPct.replace('-', '') : currentGrowthPct
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
              {growthPrefix}{displayGrowth}%
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
