import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { useEnsName } from 'wagmi'
import { tokens } from '@/styles/tokens'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'

interface EarningsStripProps {
  earnedEns: string
  aprPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  roundStartDate: string
  roundEndDate: string
}

const Card = styled.section`
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  padding: ${tokens.spacing['2xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  box-shadow: ${tokens.shadow.sm};
`

const EarningsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const EarnedValue = styled.span`
  font-size: 56px;
  font-weight: ${tokens.font.weight.black};
  color: ${tokens.color.positiveEmphasis};
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: 0;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const EarnedSubtitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
`

const AprRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const AprLabel = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};

  strong {
    color: ${tokens.color.darkBlue};
    font-weight: ${tokens.font.weight.bold};
  }
`

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const chipStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.bgSubtle};
  border: 1px solid ${tokens.color.borderLight};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  white-space: nowrap;
  text-decoration: none;
  cursor: default;
  transition: border-color ${tokens.transition.fast};
`

const Chip = styled.span`
  ${chipStyles}
`

const ChipLink = styled(Link)`
  ${chipStyles}
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

const ChipButton = styled.button`
  ${chipStyles}
  cursor: pointer;
  font-family: inherit;

  &:hover {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }
`

export function EarningsStrip({
  earnedEns,
  aprPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  roundStartDate,
  roundEndDate,
}: EarningsStripProps) {
  const { data: resolvedName } = useEnsName({
    address: delegatedTo as `0x${string}`,
    query: { enabled: !delegateEnsName },
  })
  const displayName = delegateEnsName ?? resolvedName ?? truncateAddress(delegatedTo)
  const streamingEarnings = useStreamingCounter(earnedEns, roundStartDate, roundEndDate)

  const shareText = `I'm earning ${aprPct}% APR on my ENS by delegating to an active voter. Join the ENS Incentives Program!`

  return (
    <Card aria-label="Your rewards">
      <EarningsBlock>
        <EarnedValue>+{streamingEarnings}</EarnedValue>
        <EarnedSubtitle>ENS earned so far</EarnedSubtitle>
      </EarningsBlock>

      <AprRow>
        <AprLabel>Earning at <strong>{aprPct}% APR</strong></AprLabel>
      </AprRow>

      <ChipRow>
        <Chip>Tier {tierIndex + 1}</Chip>
        <ChipLink to={`/voters/${delegatedTo}`}>
          Delegated to {displayName} ↗
        </ChipLink>
        <ChipButton
          type="button"
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
              '_blank',
            )
          }
        >
          Share APR ↗
        </ChipButton>
      </ChipRow>
    </Card>
  )
}
