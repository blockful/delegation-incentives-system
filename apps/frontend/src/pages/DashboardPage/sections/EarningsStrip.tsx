import styled from 'styled-components'
import { Tag } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { truncateAddress } from '@/utils/format'
import { formatBalance } from '@/utils/dashboard'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'

interface EarningsStripProps {
  earnedEns: string
  apyPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  delegateAvatarUrl?: string
  balanceEns: string
  roundStartDate: string
  roundEndDate: string
}

const Section = styled.section`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  background: ${tokens.color.surface};
  overflow: hidden;
  animation: ${fadeInUp} 0.35s ease both;
`

const TopRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} 0;
  flex-wrap: wrap;
`

const EarningsBlock = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.spacing.sm};
`

const EarnedValue = styled.span`
  font-size: 28px;
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.positive};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  line-height: 1;

  @media (min-width: 768px) {
    font-size: 36px;
  }
`

const EarnedUnit = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const MetaBlock = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const ApyLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
`

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.xl} ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const DelegatePill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const DelegateLabel = styled.span`
  color: ${tokens.color.textFaint};
`

const DelegateName = styled.span`
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.text};
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const BalanceBlock = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const BalanceValue = styled.span`
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
`

const TWAB_TOOLTIP = 'Time-weighted average balance over 180 days. Longer holding means a bigger share of the reward pool.'

export function EarningsStrip({
  earnedEns,
  apyPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  balanceEns,
  roundStartDate,
  roundEndDate,
}: EarningsStripProps) {
  const { data: resolvedName } = useEnsName({
    address: delegatedTo as `0x${string}`,
    query: { enabled: !delegateEnsName },
  })
  const displayName = delegateEnsName ?? resolvedName ?? truncateAddress(delegatedTo)
  const streamingEarnings = useStreamingCounter(earnedEns, roundStartDate, roundEndDate)

  return (
    <Section aria-label="Your earnings">
      <TopRow>
        <EarningsBlock>
          <EarnedValue>+{streamingEarnings}</EarnedValue>
          <EarnedUnit>ENS</EarnedUnit>
        </EarningsBlock>
        <MetaBlock>
          <ApyLabel>{apyPct}% APY</ApyLabel>
          <Tag colorStyle="bluePrimary" size="small">Tier {tierIndex + 1}</Tag>
        </MetaBlock>
      </TopRow>
      <BottomRow>
        <DelegatePill>
          <EnsAvatar
            address={delegatedTo}
            name={delegateEnsName ?? resolvedName ?? undefined}
            avatarUrl={delegateAvatarUrl}
            size={20}
          />
          <DelegateLabel>Delegating to</DelegateLabel>
          <DelegateName>{displayName}</DelegateName>
        </DelegatePill>
        <BalanceBlock>
          <InfoTooltip text={TWAB_TOOLTIP}>
            <BalanceValue>{formatBalance(balanceEns)} ENS</BalanceValue>
          </InfoTooltip>
        </BalanceBlock>
      </BottomRow>
    </Section>
  )
}
