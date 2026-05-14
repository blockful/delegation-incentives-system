import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { tokens } from '@/styles/tokens'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'

interface EarningsStripProps {
  earnedEns: string
  aprPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  delegateAvatarUrl?: string
  balanceEns: string
  roundStartDate: string
  roundEndDate: string
  roundNumber: number
  daysRemaining: number
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

const PillsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const TierBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
`

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  background: ${tokens.color.surface};
  white-space: nowrap;
`

const TimePill = styled(Pill)`
  background: ${tokens.color.lightOrange};
  border-color: transparent;
  color: ${tokens.color.orange};
  font-weight: ${tokens.font.weight.bold};
`

const ButtonsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${tokens.spacing.md};
`

const ShareButton = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  padding: 10px ${tokens.spacing.lg};
  border-radius: ${tokens.radius.md};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  cursor: pointer;
  transition: opacity ${tokens.transition.fast};
  border: 1px solid ${({ $primary }) => ($primary ? tokens.color.blue : tokens.color.gray)};
  background: ${({ $primary }) => ($primary ? tokens.color.blue : tokens.color.surface)};
  color: ${({ $primary }) => ($primary ? tokens.color.white : tokens.color.darkGray)};

  &:hover {
    opacity: 0.85;
  }
`

export function EarningsStrip({
  earnedEns,
  aprPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  roundStartDate,
  roundEndDate,
  roundNumber,
  daysRemaining,
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
        <TierBadge>Tier {tierIndex + 1}</TierBadge>
      </AprRow>

      <PillsRow>
        <Pill>
          <EnsAvatar
            address={delegatedTo}
            name={delegateEnsName ?? resolvedName ?? undefined}
            avatarUrl={delegateAvatarUrl}
            size={16}
          />
          Delegating to <strong style={{ color: tokens.color.darkBlue }}>{displayName}</strong>
        </Pill>
        <Pill>Round {roundNumber}</Pill>
        <TimePill>{daysRemaining}d left</TimePill>
      </PillsRow>

      <ButtonsRow>
        <ShareButton
          $primary
          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')}
        >
          𝕏 Share your rewards
        </ShareButton>
        <ShareButton
          onClick={() => window.open(`https://t.me/share/url?text=${encodeURIComponent(shareText)}`, '_blank')}
        >
          ✈ Share on Telegram
        </ShareButton>
      </ButtonsRow>
    </Card>
  )
}
