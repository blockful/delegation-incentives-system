import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button, CheckSVG, LockSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import { formatPool, formatVpNeeded, computeVpProgress } from '@/utils/dashboard'
import type { TierEntry } from '@/api/types'

interface RewardTiersProps {
  tiers: TierEntry[]
  currentTierIndex: number
  userEstimatedReward: string
}

const Section = styled.section`
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  overflow: hidden;
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
`

const Header = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.gray};
`

const Title = styled.h2`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  margin: 0 0 2px;
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  margin: 0;
`

const Rows = styled.div`
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
`

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
`

const TierRow = styled.div<{ $isCurrent: boolean; $isLocked: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
  padding: 10px ${tokens.spacing.md};
  margin: 2px ${tokens.spacing.xs};
  border-radius: ${tokens.radius.sm};
  background: ${({ $isCurrent }) => ($isCurrent ? tokens.color.tierHighlight : 'transparent')};
  opacity: ${({ $isLocked }) => ($isLocked ? 0.45 : 1)};
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.lg};
  font-weight: ${({ $isCurrent }) => ($isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium)};
  color: ${tokens.color.darkBlue};
  flex-shrink: 0;
`

const TierRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const Dots = styled.div`
  display: flex;
  gap: ${tokens.spacing.xs};
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean; $isUnlocked: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $isUnlocked }) =>
    $filled
      ? ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)
      : tokens.color.middleGray};
`

const ApyText = styled.span<{ $isUnlocked: boolean }>`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $isUnlocked }) => ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)};
  width: 110px;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const PoolText = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  min-width: 80px;
  white-space: nowrap;
`

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
  }
`

const Footer = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-top: 1px solid ${tokens.color.gray};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`

const ProgressInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const ProgressText = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.4;

  strong {
    color: ${tokens.color.darkBlue};
    font-weight: ${tokens.font.weight.semibold};
  }
`

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.borderLight};
  overflow: hidden;
  max-width: 200px;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.blue};
  width: ${({ $pct }) => Math.min(Math.max($pct, 2), 100)}%;
  transition: width 0.5s ease;
`

const ShareLink = styled(Link)`
  text-decoration: none;
  flex-shrink: 0;
`

export function RewardTiers({
  tiers,
  currentTierIndex,
}: RewardTiersProps) {
  const currentTier = tiers[currentTierIndex]
  const nextTier = tiers[currentTierIndex + 1]
  const isMaxTier = currentTierIndex >= tiers.length - 1
  const vpProgress = computeVpProgress(
    currentTier.requiredAVP,
    nextTier?.requiredAVP,
    nextTier?.additionalVPNeeded,
  )

  return (
    <Section aria-label="Reward tiers">
      <Header>
        <Title>Reward Tiers</Title>
        <Subtitle>
          Higher tiers unlock as more ENS gets delegated — everyone earns more.
        </Subtitle>
      </Header>

      <Rows>
        {tiers.map((tier, i) => {
          const isLocked = !tier.isUnlocked
          const isCurrent = tier.index === currentTierIndex
          const apyLabel = tier.estimatedApyPct != null ? `~${tier.estimatedApyPct}% APY` : '—'

          return (
            <div key={tier.index}>
              {i > 0 && <Separator />}
              <TierRow $isCurrent={isCurrent} $isLocked={isLocked}>
                <TierLabel $isCurrent={isCurrent}>Tier #{tier.index + 1}</TierLabel>
                <TierRight>
                  <PoolText>{formatPool(tier.poolSizeEns)} ENS</PoolText>
                  <Dots>
                    {Array.from({ length: tiers.length }, (_, j) => (
                      <Dot key={j} $filled={j <= tier.index} $isUnlocked={tier.isUnlocked} />
                    ))}
                  </Dots>
                  <ApyText $isUnlocked={tier.isUnlocked}>{apyLabel}</ApyText>
                  <StatusIcon>
                    {tier.isUnlocked ? (
                      <CheckSVG style={{ color: tokens.color.positiveEmphasis }} />
                    ) : (
                      <LockSVG style={{ color: tokens.color.darkBlue }} />
                    )}
                  </StatusIcon>
                </TierRight>
              </TierRow>
            </div>
          )
        })}
      </Rows>

      {!isMaxTier && nextTier && (
        <Footer>
          <ProgressInfo>
            <ProgressText>
              <strong>{formatVpNeeded(nextTier.additionalVPNeeded)} VP</strong> to Tier {nextTier.index + 1} at {nextTier.estimatedApyPct}% APY
            </ProgressText>
            <ProgressTrack>
              <ProgressFill $pct={vpProgress} />
            </ProgressTrack>
          </ProgressInfo>
          <ShareLink to="/delegates">
            <Button size="small" colorStyle="bluePrimary" width="auto">
              Share &amp; grow the pool
            </Button>
          </ShareLink>
        </Footer>
      )}
    </Section>
  )
}
