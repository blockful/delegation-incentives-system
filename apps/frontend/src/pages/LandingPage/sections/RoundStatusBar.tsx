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
  max-width: 600px;
  margin: 0 auto;
  padding: 0 ${tokens.spacing.xl};
  position: relative;
  z-index: 1;
  transform: translateY(-50%);
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  box-shadow: 0px 1px 3px #0000000f;
`

const Tagline = styled.span`
  font-size: 13px;
  font-weight: ${tokens.font.weight.bold};
  color: #1a7f37;
  text-align: center;
  width: 100%;
`

const DataRow = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  padding: 10px 16px;
`

const Col = styled.div<{ $align?: 'left' | 'center' | 'right' }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  align-items: ${({ $align }) =>
    $align === 'center' ? 'center' : $align === 'right' ? 'flex-end' : 'flex-start'};
`

const ColLabel = styled.span`
  font-size: 14px;
  font-weight: ${tokens.font.weight.bold};
  color: #1f2328;
  line-height: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const ColSub = styled.span`
  font-size: 12px;
  font-weight: ${tokens.font.weight.normal};
  color: #57606a;
  line-height: 16px;
`

const LiveDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1a7f37;
  flex-shrink: 0;
`

const GrowthLabel = styled.span<{ $negative?: boolean }>`
  font-size: 14px;
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $negative }) => ($negative ? tokens.color.negative : '#1a7f37')};
  line-height: 18px;
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
      <Card>
        <Tagline>No tokens locked · Gas sponsored · Rewards auto-sent</Tagline>
        <DataRow>
          <Col $align="left">
            <ColLabel>
              <LiveDot />
              Round {displayRound}
            </ColLabel>
            <ColSub>{displayTimeLeft}</ColSub>
          </Col>
          <Col $align="center">
            <GrowthLabel $negative={isNegative}>
              {growthPrefix}{displayGrowth}%
            </GrowthLabel>
            <ColSub>active VP growth</ColSub>
          </Col>
          <Col $align="right">
            <ColLabel>Tier {currentTierIndex + 1}</ColLabel>
            <ColSub>{poolSizeEns} ENS pool</ColSub>
          </Col>
        </DataRow>
      </Card>
    </Wrapper>
  )
}
