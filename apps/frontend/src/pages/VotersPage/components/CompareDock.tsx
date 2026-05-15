import styled, { css, keyframes } from 'styled-components'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { tokens } from '@/styles/tokens'
import type { VoterDetail } from '@/api/types'

interface CompareDockProps {
  selected: string[]
  voters: Map<string, VoterDetail>
  onOpen: () => void
  onClear: () => void
}

const slideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, 16px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
`

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const Dock = styled.div`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md} ${tokens.spacing.sm}
    ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.pill};
  box-shadow: ${tokens.shadow.soft};
  max-width: calc(100vw - 32px);

  ${css`
    animation: ${slideUp} 200ms ease-out both;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeIn} 160ms ease-out both;
    transform: translateX(-50%);
  }
`

const Avatars = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  & > *:not(:first-child) {
    margin-left: -10px;
  }
`

const AvatarRing = styled.span`
  display: inline-flex;
  border-radius: 50%;
  background: ${tokens.color.surface};
  padding: 2px;
  box-shadow: 0 0 0 1px ${tokens.color.borderLight};
`

const MoreChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 ${tokens.spacing.sm};
  border-radius: 50%;
  background: ${tokens.color.bgSubtle};
  border: 1px solid ${tokens.color.borderLight};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  font-variant-numeric: tabular-nums;
  margin-left: -10px;
`

const OpenButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.pill};
  border: 1px solid ${tokens.color.blue};
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }

  &:disabled {
    background: ${tokens.color.middleGray};
    border-color: ${tokens.color.middleGray};
    color: ${tokens.color.white};
    cursor: not-allowed;
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }
`

const ClearLink = styled.button`
  background: none;
  border: none;
  padding: 0 ${tokens.spacing.xs};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.darkBlue};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

const VISIBLE_AVATARS = 3

export function CompareDock({
  selected,
  voters,
  onOpen,
  onClear,
}: CompareDockProps) {
  if (selected.length === 0) return null

  const visible = selected.slice(0, VISIBLE_AVATARS)
  const extra = Math.max(0, selected.length - VISIBLE_AVATARS)
  const canCompare = selected.length >= 2

  return (
    <Dock role="region" aria-label="Compare voters">
      <Avatars aria-hidden>
        {visible.map((addr) => {
          const voter = voters.get(addr)
          return (
            <AvatarRing key={addr}>
              <EnsAvatar
                address={addr}
                name={voter?.ensName ?? undefined}
                avatarUrl={voter?.avatarUrl ?? undefined}
                size={28}
              />
            </AvatarRing>
          )
        })}
        {extra > 0 && <MoreChip>+{extra} more</MoreChip>}
      </Avatars>

      <OpenButton type="button" onClick={onOpen} disabled={!canCompare}>
        Compare {selected.length} voters →
      </OpenButton>

      <ClearLink type="button" onClick={onClear} aria-label="Clear comparison">
        Clear
      </ClearLink>
    </Dock>
  )
}
