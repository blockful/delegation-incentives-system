import styled, { keyframes } from 'styled-components'
import { tokens } from '@/styles/tokens'

interface ProposalBarProps {
  votes: boolean[]
  /** Optional proposal titles, indexed parallel to votes — used in hover tooltips. */
  proposalTitles?: (string | null | undefined)[]
  /** Show the inline `X/N` count to the right of the bar. Default true. */
  showCount?: boolean
}

const fadeInLeft = keyframes`
  from { opacity: 0; transform: scaleY(0.3); }
  to   { opacity: 1; transform: scaleY(1); }
`

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const Segments = styled.div`
  display: flex;
  gap: 3px;
  flex: 1;
  align-items: stretch;
`

const Segment = styled.div<{ $voted: boolean; $index: number }>`
  position: relative;
  height: 12px;
  flex: 1;
  border-radius: 4px;
  background: ${({ $voted }) =>
    $voted ? tokens.color.positiveEmphasis : tokens.color.borderLight};
  border: 1px solid
    ${({ $voted }) =>
      $voted ? tokens.color.positiveEmphasis : tokens.color.middleGray};
  transform-origin: bottom center;
  animation: ${fadeInLeft} 0.32s ease both;
  animation-delay: ${({ $index }) => `${$index * 0.035}s`};
  cursor: default;
  transition:
    transform ${tokens.transition.fast},
    box-shadow ${tokens.transition.fast};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 6px
      ${({ $voted }) =>
        $voted ? 'rgba(26, 127, 55, 0.25)' : 'rgba(0, 0, 0, 0.08)'};
  }
`

const Score = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

function defaultTooltip(index: number, voted: boolean, title?: string | null): string {
  const label = voted ? 'Voted' : 'Did not vote'
  if (title && title.trim().length > 0) {
    return `${label} · "${title}"`
  }
  return `${label} on proposal #${index + 1} (of last 10)`
}

export function ProposalBar({ votes, proposalTitles, showCount = true }: ProposalBarProps) {
  const voted = votes.filter(Boolean).length
  const total = votes.length

  return (
    <Wrapper>
      <Segments>
        {votes.map((v, i) => (
          <Segment
            key={i}
            $voted={v}
            $index={i}
            data-segment
            data-voted={v}
            title={defaultTooltip(i, v, proposalTitles?.[i])}
            aria-label={defaultTooltip(i, v, proposalTitles?.[i])}
          />
        ))}
      </Segments>
      {showCount && (
        <Score>
          {voted}/{total}
        </Score>
      )}
    </Wrapper>
  )
}
