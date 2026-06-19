import styled, { css } from 'styled-components'
import { tokens } from '@/styles'

export interface MatchmakingPitchProps {
  title: string
  body: string
  primaryLabel: string
  onPrimary: () => void
  /** Secondary action label (defaults to "Not now"). */
  secondaryLabel?: string
  /** Omit to hide the secondary action. */
  onSecondary?: () => void
}

/**
 * The shared "flag" pitch: illustration + title + body + a primary CTA and an
 * optional secondary. Rendered both inside the SelectionFlow modal (Pitch step)
 * and as the /voters blocked-state hero, so the two presentations never drift
 * apart again — the earlier duplicate plain card is exactly what this replaces.
 */
export function MatchmakingPitch({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel = 'Not now',
  onSecondary,
}: MatchmakingPitchProps) {
  return (
    <Centered>
      <Illustration src="/pitch-illustration.svg" alt="" />
      <Title>{title}</Title>
      <Body>{body}</Body>
      <Actions>
        <Primary type="button" onClick={onPrimary}>
          {primaryLabel}
        </Primary>
        {onSecondary && (
          <Secondary type="button" onClick={onSecondary}>
            {secondaryLabel}
          </Secondary>
        )}
      </Actions>
    </Centered>
  )
}

const Centered = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${tokens.spacing.lg};
`

const Illustration = styled.img`
  display: block;
  width: 100%;
  max-width: 440px;
  height: auto;
  margin: 0 auto;
`

const Title = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  line-height: 1.15;
`

const Body = styled.p`
  margin: 0;
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.lg};
  line-height: 1.56;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;
`

const buttonBase = css`
  width: 100%;
  border-radius: ${tokens.radius.lg};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  padding: 14px ${tokens.spacing.lg};
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};
`

const Primary = styled.button`
  ${buttonBase}
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: 1px solid ${tokens.color.blue};

  &:hover:not(:disabled) {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }
`

const Secondary = styled.button`
  ${buttonBase}
  background: ${tokens.color.white};
  color: ${tokens.color.textSecondary};
  border: 1px solid ${tokens.color.border};

  &:hover {
    background: ${tokens.color.bgSubtle};
  }
`
