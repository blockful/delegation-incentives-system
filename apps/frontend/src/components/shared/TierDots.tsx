import styled from 'styled-components'
import type { ComponentPropsWithoutRef } from 'react'
import { tokens } from '@/styles/tokens'

interface TierDotsProps extends ComponentPropsWithoutRef<'div'> {
  tierIndex: number
  currentTierIndex?: number
  totalTiers?: number
  isUnlocked?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const dotSizes = {
  sm: '7px',
  md: '10px',
  lg: '12px',
} as const

const Wrapper = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  display: flex;
  gap: ${({ $size }) => ($size === 'sm' ? '3px' : tokens.spacing.xs)};
  align-items: center;
  flex-wrap: wrap;
`

const Dot = styled.div<{ $filled: boolean; $unlocked: boolean; $size: 'sm' | 'md' | 'lg' }>`
  width: ${({ $size }) => dotSizes[$size]};
  height: ${({ $size }) => dotSizes[$size]};
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $unlocked }) => {
    if (!$filled) return tokens.color.middleGray
    return $unlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue
  }};
`

export function TierDots({
  tierIndex,
  currentTierIndex,
  totalTiers = 7,
  isUnlocked,
  size = 'md',
  ...divProps
}: TierDotsProps) {
  const unlocked = isUnlocked ?? (currentTierIndex !== undefined ? tierIndex <= currentTierIndex : true)
  return (
    <Wrapper $size={size} {...divProps}>
      {Array.from({ length: totalTiers }, (_, i) => (
        <Dot key={i} $filled={i <= tierIndex} $unlocked={unlocked} $size={size} />
      ))}
    </Wrapper>
  )
}
