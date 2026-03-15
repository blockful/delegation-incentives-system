import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import type { TierEntry } from '@/api/types'

interface TierProgressionCardProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Card = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  overflow: hidden;
  background: ${tokens.color.surface};
`

const Header = styled.div`
  padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
  border-bottom: 1px solid ${tokens.color.border};
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HeaderTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const HeaderSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const TierList = styled.div`
  display: flex;
  flex-direction: column;
`

const TierRow = styled.div<{ $isCurrent: boolean; $isUnlocked: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.06)' : 'transparent'};
  border-left: 3px solid ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : 'transparent'};
  opacity: ${({ $isUnlocked }) => ($isUnlocked ? 1 : 0.55)};
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${({ $isCurrent }) =>
    $isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : tokens.color.text};
  min-width: 48px;
`

const VpInfo = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ApyBadge = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : tokens.color.text};
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 56px;
`

const StatusDot = styled.span<{ $status: 'current' | 'unlocked' | 'locked' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) =>
    $status === 'current'
      ? tokens.color.accent
      : $status === 'unlocked'
        ? tokens.color.positive
        : tokens.color.gray3};
`

const Footer = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  border-top: 1px solid ${tokens.color.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const FooterText = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
`

function formatVp(vpWei: string): string {
  const num = Number(vpWei) / 1e18
  if (num <= 0) return ''
  if (num >= 1_000_000) return `+${(num / 1_000_000).toFixed(1)}M VP`
  if (num >= 1_000) return `+${Math.round(num / 1_000)}K VP`
  return `+${Math.round(num)} VP`
}

export function TierProgressionCard({
  tiers,
  currentTierIndex,
}: TierProgressionCardProps) {
  const nextTier = tiers[currentTierIndex + 1]
  const isMaxTier = currentTierIndex >= tiers.length - 1

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Tier Progression</HeaderTitle>
          <HeaderSub>
            {isMaxTier
              ? 'You\'re at the highest tier — maximum rewards unlocked.'
              : `The more people delegate, the higher the tier and APY for everyone.`
            }
          </HeaderSub>
        </HeaderLeft>
      </Header>

      <TierList>
        {tiers.map((tier) => {
          const isCurrent = tier.index === currentTierIndex
          const status: 'current' | 'unlocked' | 'locked' = isCurrent
            ? 'current'
            : tier.isUnlocked
              ? 'unlocked'
              : 'locked'

          return (
            <TierRow
              key={tier.index}
              $isCurrent={isCurrent}
              $isUnlocked={tier.isUnlocked || isCurrent}
            >
              <StatusDot $status={status} />
              <TierLabel $isCurrent={isCurrent}>
                Tier {tier.index + 1}
                {isCurrent && ' — You are here'}
              </TierLabel>
              <VpInfo>
                {!tier.isUnlocked && !isCurrent && tier.additionalVPNeeded
                  ? formatVp(tier.additionalVPNeeded)
                  : ''
                }
              </VpInfo>
              <ApyBadge $isCurrent={isCurrent}>
                {tier.estimatedApyPct}%
              </ApyBadge>
            </TierRow>
          )
        })}
      </TierList>

      {!isMaxTier && nextTier && (
        <Footer>
          <FooterText>
            {formatVp(nextTier.additionalVPNeeded)} of delegated voting power needed to unlock Tier {nextTier.index + 1} at {nextTier.estimatedApyPct}% APY
          </FooterText>
          <Button size="small" colorStyle="bluePrimary" width="auto">
            Share &amp; grow the pool
          </Button>
        </Footer>
      )}
    </Card>
  )
}
