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
  roundStartDate: string
  roundEndDate: string
}

const Card = styled.div`
  background: #011A25;
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (min-width: 768px) {
    padding: 40px;
  }
`

const Label = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #0080BC;
`

const EarnedAmount = styled.span`
  font-size: 40px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';

  @media (min-width: 768px) {
    font-size: 56px;
  }
`

const Unit = styled.span`
  font-size: 14px;
  color: #CEE1E8;
  opacity: 0.6;
`

const ApyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const ApyText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #CEE1E8;
`

const InfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const InfoPill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 6px 12px 6px 6px;
  font-size: 13px;
  font-weight: 500;
  color: #CEE1E8;
`

const TextPill = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #CEE1E8;
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
          <EnsAvatar address={delegatedTo} name={delegateEnsName} size={20} />
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
