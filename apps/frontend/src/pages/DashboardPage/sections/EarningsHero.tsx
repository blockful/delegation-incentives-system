import styled, { keyframes } from 'styled-components'
import { Button, Tag } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'

interface EarningsHeroProps {
  earnedEns: string
  apyPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName?: string
  delegateAvatarUrl?: string
  roundStartDate: string
  roundEndDate: string
}

const Card = styled.div`
  background: ${tokens.color.darkBlue};
  border-radius: ${tokens.radius.xl};
  padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']};
  position: relative;
  overflow: hidden;

  /* Subtle glow */
  &::before {
    content: '';
    position: absolute;
    top: -40%;
    right: -20%;
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(0, 128, 188, 0.15) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']};
  }
`

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const EyebrowLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
  animation: ${fadeInUp} 0.4s ease both;
`

const EarningsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  animation: ${fadeInUp} 0.4s ease 0.05s both;
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const EarnedAmount = styled.span`
  font-size: 44px;
  font-weight: ${tokens.font.weight.extrabold};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  background: linear-gradient(
    90deg,
    ${tokens.color.surface} 0%,
    ${tokens.color.lightBlue} 50%,
    ${tokens.color.surface} 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 6s linear infinite;

  @media (min-width: 768px) {
    font-size: 56px;
  }
`

const EarnedSub = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.lightBlue};
  opacity: 0.6;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
  animation: ${fadeInUp} 0.4s ease 0.1s both;
`

const ApyText = styled.span`
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.lightBlue};
`

const DelegateRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  animation: ${fadeInUp} 0.4s ease 0.15s both;
`

const DelegatePill = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: ${tokens.radius.pill};
  padding: 5px ${tokens.spacing.md} 5px 5px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.lightBlue};
`

const DelegateName = styled.span`
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ShareRow = styled.div`
  animation: ${fadeInUp} 0.4s ease 0.2s both;
`

export function EarningsHero({
  earnedEns,
  apyPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  roundStartDate,
  roundEndDate,
}: EarningsHeroProps) {
  const { data: resolvedEnsName } = useEnsName({
    address: delegatedTo as `0x${string}`,
    query: { enabled: !delegateEnsName },
  })
  const displayName = delegateEnsName ?? resolvedEnsName ?? truncateAddress(delegatedTo)
  const streamingEarnings = useStreamingCounter(earnedEns, roundStartDate, roundEndDate)

  return (
    <Card>
      <Content>
        <EyebrowLabel>Your Earnings</EyebrowLabel>

        <EarningsBlock>
          <EarnedAmount>+{streamingEarnings}</EarnedAmount>
          <EarnedSub>ENS earned this round</EarnedSub>
        </EarningsBlock>

        <MetaRow>
          <ApyText>Earning at {apyPct}% APY</ApyText>
          <Tag colorStyle="bluePrimary">Tier {tierIndex + 1}</Tag>
        </MetaRow>

        <DelegateRow>
          <DelegatePill>
            <EnsAvatar
              address={delegatedTo}
              name={delegateEnsName ?? resolvedEnsName ?? undefined}
              avatarUrl={delegateAvatarUrl}
              size={20}
            />
            <DelegateName>{displayName}</DelegateName>
          </DelegatePill>
        </DelegateRow>

        <ShareRow>
          <Button size="small" colorStyle="bluePrimary" width="auto">
            Share your earnings
          </Button>
        </ShareRow>
      </Content>
    </Card>
  )
}
