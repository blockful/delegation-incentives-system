import styled from 'styled-components'
import { Button, Tag } from '@ensdomains/thorin'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'

interface EarningsCardProps {
  earnedEns: string
  apyPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  roundNumber: number
  timeLeft: string
}

const Card = styled.div`
  border-radius: 20px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f0 100%);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Label = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const EarnedAmount = styled.span`
  font-size: 36px;
  font-weight: 800;
  color: #49b365;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';

  @media (min-width: 768px) {
    font-size: 48px;
  }
`

const Subtitle = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const ApyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ApyText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Pill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  padding: 6px 12px 6px 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`

const TextPill = styled.div`
  background: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

export function EarningsCard({
  earnedEns,
  apyPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  roundNumber,
  timeLeft,
}: EarningsCardProps) {
  const displayName = delegateEnsName ?? truncateAddress(delegatedTo)
  const tierLabel = `Tier ${tierIndex + 1}`
  const streamingEarnings = useStreamingCounter(earnedEns)

  return (
    <Card>
      <Label>Your Earnings</Label>
      <EarnedAmount>+{streamingEarnings}</EarnedAmount>
      <Subtitle>ENS earned so far</Subtitle>

      <ApyRow>
        <ApyText>Earning at {apyPct}% APY</ApyText>
        <Tag colorStyle="bluePrimary">{tierLabel}</Tag>
      </ApyRow>

      <Pills>
        <Pill>
          <EnsAvatar address={delegatedTo} name={delegateEnsName} size={22} />
          Delegating to {displayName}
        </Pill>
        <TextPill>Round {roundNumber}</TextPill>
        <TextPill>{timeLeft} left</TextPill>
      </Pills>

      <ButtonRow>
        <Button size="small" width="auto">
          Share your earnings
        </Button>
        <Button size="small" colorStyle="greySecondary" width="auto">
          Share on Telegram
        </Button>
      </ButtonRow>
    </Card>
  )
}
