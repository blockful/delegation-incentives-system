import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface TierDotsProps {
  tierIndex: number
  totalTiers?: number
}

const Wrapper = styled.div`
  display: flex;
  gap: ${tokens.spacing.xs};
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $filled }) => ($filled ? tokens.color.text : tokens.color.border)};
`

export function TierDots({ tierIndex, totalTiers = 7 }: TierDotsProps) {
  return (
    <Wrapper>
      {Array.from({ length: totalTiers }, (_, i) => (
        <Dot key={i} $filled={i <= tierIndex} />
      ))}
    </Wrapper>
  )
}
