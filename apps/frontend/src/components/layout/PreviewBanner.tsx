import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

const LAUNCH_AT_MS = Date.UTC(2026, 6, 1, 0, 0, 0) // 2026-07-01 00:00 UTC
const LAUNCH_LABEL = 'July 1, 2026'
const FEEDBACK_URL =
  'https://forms.clickup.com/90132341641/f/2ky4wrw9-32173/V2SGIA6QAIMSV2KX2Z'

const Bar = styled.div`
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.base};
  line-height: 1.4;
`

const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.lg};
  padding: 12px 20px;

  @media (min-width: 768px) {
    padding: 10px 40px;
  }
`

const Message = styled.span`
  display: inline;
`

const InlineFeedback = styled.a`
  display: none;
  color: ${tokens.color.white};
  font-weight: ${tokens.font.weight.medium};
  text-decoration: none;
  margin-left: ${tokens.spacing.sm};
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 0.85;
  }

  @media (min-width: 768px) {
    display: inline;
  }
`

const MobileFeedback = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${tokens.color.white};
  font-weight: ${tokens.font.weight.medium};
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 0.85;
  }

  @media (min-width: 768px) {
    display: none;
  }
`

const Countdown = styled.div`
  display: none;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    display: flex;
  }
`

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: ${tokens.radius.pill};
  background: rgba(255, 255, 255, 0.18);
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  font-variant-numeric: tabular-nums;
  color: ${tokens.color.white};
`

type Remaining = {
  days: number
  hours: number
  minutes: number
}

function getRemaining(now: number): Remaining | null {
  const diffMs = LAUNCH_AT_MS - now
  if (diffMs <= 0) return null
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

export function PreviewBanner() {
  const [remaining, setRemaining] = useState<Remaining | null>(() =>
    getRemaining(Date.now()),
  )

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(Date.now()))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!remaining) return null

  return (
    <Bar role="region" aria-label="Internal preview notice">
      <Inner>
        <Message>
          This is an internal preview. Public launch on {LAUNCH_LABEL}.
          <InlineFeedback
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Give feedback →
          </InlineFeedback>
        </Message>

        <MobileFeedback
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Give feedback →
        </MobileFeedback>

        <Countdown aria-label="Time until public launch">
          <Chip>{remaining.days} days</Chip>
          <Chip>{remaining.hours} hours</Chip>
          <Chip>{remaining.minutes} min</Chip>
        </Countdown>
      </Inner>
    </Bar>
  )
}
