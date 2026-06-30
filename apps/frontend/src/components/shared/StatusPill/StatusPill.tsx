import styled from 'styled-components'
import { tokens } from '@/styles/tokens'
import { LiveDot } from '@/components/shared/LiveDot'
import type { RoundStatus, RewardStatus } from '@/api/types'

export type StatusTone = 'success' | 'warning' | 'pending' | 'danger' | 'neutral'

interface StatusPillProps {
  tone: RoundStatus | RewardStatus | StatusTone
  pulse?: boolean
  iconLeading?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

function mapToTone(t: StatusPillProps['tone']): StatusTone {
  // Round + reward statuses → visual tone
  if (t === 'live' || t === 'paid' || t === 'success') return 'success'
  if (t === 'pending' || t === 'upcoming') return 'pending'
  if (t === 'no_reward' || t === 'not_eligible' || t === 'unavailable' || t === 'ended' || t === 'neutral') return 'neutral'
  if (t === 'warning') return 'warning'
  if (t === 'danger') return 'danger'
  return 'neutral'
}

function defaultLabel(t: StatusPillProps['tone']): string {
  if (t === 'live') return 'live'
  if (t === 'paid') return 'paid'
  if (t === 'upcoming') return 'upcoming'
  if (t === 'pending') return 'pending'
  if (t === 'ended') return 'ended'
  if (t === 'no_reward') return 'no payout'
  if (t === 'not_eligible') return 'no reward'
  if (t === 'unavailable') return 'unavailable'
  return String(t)
}

const Pill = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.2;
  white-space: nowrap;

  background: ${({ $tone }) => tokens.color.status[$tone].bg};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  border: 1px solid ${({ $tone }) => tokens.color.status[$tone].border};
`

export function StatusPill({ tone, pulse, iconLeading, children, className }: StatusPillProps) {
  const visualTone = mapToTone(tone)
  const showLiveDot = pulse ?? tone === 'live'
  return (
    <Pill $tone={visualTone} className={className} role="status">
      {showLiveDot && !iconLeading ? <LiveDot tone={visualTone === 'success' ? 'success' : 'blue'} pulse /> : iconLeading}
      {children ?? defaultLabel(tone)}
    </Pill>
  )
}
