import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import { TierLadderRow } from '@/components/shared/TierLadderRow'
import { formatVpNeeded, computeVpProgress } from '@/utils/dashboard'
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
    currentTier.requiredTotalVP,
    nextTier?.requiredTotalVP,
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
        {tiers.map((tier, i) => (
          <div key={tier.index}>
            {i > 0 && <Separator />}
            <TierLadderRow
              tier={tier}
              total={tiers.length}
              isCurrent={tier.index === currentTierIndex}
            />
          </div>
        ))}
      </Rows>

      {!isMaxTier && nextTier && (
        <Footer>
          <ProgressInfo>
            <ProgressText>
              <strong>{formatVpNeeded(nextTier.additionalVPNeeded)} VP</strong> to Tier {nextTier.index + 1} at {nextTier.estimatedAprPct}% APR
            </ProgressText>
            <ProgressTrack>
              <ProgressFill $pct={vpProgress} />
            </ProgressTrack>
          </ProgressInfo>
          <ShareLink to="/voters">
            <Button size="small" colorStyle="bluePrimary" width="auto">
              Share &amp; grow the pool
            </Button>
          </ShareLink>
        </Footer>
      )}
    </Section>
  )
}
