import styled from 'styled-components'
import { Button, Tag } from '@ensdomains/thorin'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { tokens } from '@/styles/tokens'

interface EarningsCardProps {
  earnedEns: string
  apyPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  delegateAvatarUrl?: string
  roundNumber: number
  timeLeft: string
  roundStartDate: string
  roundEndDate: string
}

const Card = styled.div`
  background: ${tokens.color.darkBlue};
  border-radius: ${tokens.radius.xl};
  padding: ${tokens.spacing['3xl']};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']};
  }
`

const Label = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
`

const EarnedAmount = styled.span`
  font-size: 40px;
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.surface};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';

  @media (min-width: 768px) {
    font-size: 56px;
  }
`

const Unit = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.lightBlue};
  opacity: 0.6;
`

const ApyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const ApyText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.lightBlue};
`

const InfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const InfoPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: ${tokens.radius.pill};
  padding: 6px ${tokens.spacing.md} 6px 6px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.lightBlue};
`

const TextPill = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border-radius: ${tokens.radius.pill};
  padding: 6px ${tokens.spacing.md};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.lightBlue};
`

const ButtonRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

export function EarningsCard({
  earnedEns,
  apyPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  roundNumber,
  timeLeft,
  roundStartDate,
  roundEndDate,
}: EarningsCardProps) {
  const displayName = delegateEnsName ?? truncateAddress(delegatedTo)
  const tierLabel = `Tier ${tierIndex + 1}`
  const streamingEarnings = useStreamingCounter(earnedEns, roundStartDate, roundEndDate)

  return (
    <Card>
      <Label>Your Earnings</Label>
      <div>
        <EarnedAmount>+{streamingEarnings}</EarnedAmount>
        <Unit> ENS earned</Unit>
      </div>

      <ApyRow>
        <ApyText>Earning at {apyPct}% APY</ApyText>
        <Tag colorStyle="bluePrimary">{tierLabel}</Tag>
      </ApyRow>

      <InfoRow>
        <InfoPill>
          <EnsAvatar address={delegatedTo} name={delegateEnsName} avatarUrl={delegateAvatarUrl} size={20} />
          {displayName}
        </InfoPill>
        <TextPill>Round {roundNumber}</TextPill>
        <TextPill>{timeLeft}</TextPill>
      </InfoRow>

      <ButtonRow>
        <Button size="small" colorStyle="bluePrimary" width="auto">
          Share your earnings
        </Button>
      </ButtonRow>
    </Card>
  )
}
