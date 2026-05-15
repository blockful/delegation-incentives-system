import styled, { css, keyframes } from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LiveDotProps {
  tone?: 'success' | 'blue' | 'warning' | 'danger'
  pulse?: boolean
  size?: number
  className?: string
}

const livePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 currentColor; }
  60%      { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); }
`

const Dot = styled.span<{ $tone: NonNullable<LiveDotProps['tone']>; $pulse: boolean; $size: number }>`
  display: inline-block;
  flex-shrink: 0;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  background: ${({ $tone }) => {
    if ($tone === 'blue') return tokens.color.blue
    if ($tone === 'warning') return tokens.color.orange
    if ($tone === 'danger') return tokens.color.negative
    return tokens.color.positiveEmphasis
  }};
  color: ${({ $tone }) => {
    if ($tone === 'blue') return 'rgba(82, 152, 255, 0.5)'
    if ($tone === 'warning') return 'rgba(188, 76, 0, 0.5)'
    if ($tone === 'danger') return 'rgba(245, 50, 147, 0.5)'
    return 'rgba(26, 127, 55, 0.5)'
  }};

  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${livePulse} 1.8s ease-in-out infinite;
      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
`

export function LiveDot({ tone = 'success', pulse = true, size = 8, className }: LiveDotProps) {
  return <Dot $tone={tone} $pulse={pulse} $size={size} className={className} aria-hidden />
}
