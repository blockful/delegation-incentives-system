import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface TierDotsProps {
  tierIndex: number
  currentTierIndex?: number
  totalTiers?: number
}

const Wrapper = styled.div`
  display: flex;
  gap: ${tokens.spacing.xs};
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean; $unlocked: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $unlocked }) => {
    if (!$filled) return tokens.color.middleGray
    return $unlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue
  }};
`

export function TierDots({ tierIndex, currentTierIndex, totalTiers = 7 }: TierDotsProps) {
  const isUnlocked = currentTierIndex !== undefined ? tierIndex <= currentTierIndex : true
  return (
    <Wrapper>
      {Array.from({ length: totalTiers }, (_, i) => (
        <Dot key={i} $filled={i <= tierIndex} $unlocked={isUnlocked} />
      ))}
    </Wrapper>
  )
}
