import styled from 'styled-components'

interface RoundStatusBarProps {
  currentGrowthPct: string
  currentTierIndex: number
  poolSizeEns: string
  roundNumber?: number
  roundTimeLeft?: string
}

const Wrapper = styled.div`
  padding: 0 20px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media (min-width: 768px) {
    padding: 0 40px 48px;
  }
`

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`

const Pill = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #1a9a5c;
`

const PillDot = styled.span`
  color: #7a7a85;
  margin: 0 2px;
`

const InfoBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  max-width: 560px;
`

const InfoCell = styled.div`
  padding: 14px 16px;
  text-align: center;

  &:not(:last-child) {
    border-right: 1px solid #e8e8ed;
  }
`

const InfoValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3889ff;
  display: inline-block;
`

const GrowthValue = styled.span<{ $negative?: boolean }>`
  color: ${({ $negative }) => ($negative ? '#C6301B' : '#1a9a5c')};
  font-weight: 700;
`

const InfoLabel = styled.div`
  font-size: 12px;
  color: #7a7a85;
  margin-top: 2px;
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
      <Pills>
        <Pill>No tokens locked</Pill>
        <PillDot>&middot;</PillDot>
        <Pill>Gas sponsored</Pill>
        <PillDot>&middot;</PillDot>
        <Pill>Rewards auto-sent</Pill>
      </Pills>
      <InfoBar>
        <InfoCell>
          <InfoValue>
            <LiveDot />
            Round {displayRound}
          </InfoValue>
          <InfoLabel>ends {displayTimeLeft}</InfoLabel>
        </InfoCell>
        <InfoCell>
          <InfoValue>
            <GrowthValue $negative={isNegative}>
                {growthPrefix}{currentGrowthPct}%
            </GrowthValue>
          </InfoValue>
          <InfoLabel>active VP growth</InfoLabel>
        </InfoCell>
        <InfoCell>
          <InfoValue>Tier {currentTierIndex + 1}</InfoValue>
          <InfoLabel>{poolSizeEns} ENS pool</InfoLabel>
        </InfoCell>
      </InfoBar>
    </Wrapper>
  )
}
