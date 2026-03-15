import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { formatPool, formatPayout, formatVpNeeded, computeVpProgress, projectPayout } from '@/utils/dashboard'
import type { TierEntry } from '@/api/types'

interface RewardTiersProps {
  tiers: TierEntry[]
  currentTierIndex: number
  userEstimatedReward: string
}

const Section = styled.section`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  overflow: hidden;
  background: ${tokens.color.surface};
  animation: ${fadeInUp} 0.35s ease 0.1s both;
`

const Header = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.border};
`

const Title = styled.h2`
  font-size: ${tokens.font.size.md};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  margin: 0 0 2px;
`

const Subtitle = styled.p`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  margin: 0;
`

const Table = styled.div`
  width: 100%;
`

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 56px 1fr 56px 72px;
  padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  background: ${tokens.color.surfaceAlt};
  border-bottom: 1px solid ${tokens.color.border};

  @media (min-width: 768px) {
    grid-template-columns: 72px 1fr 72px 90px;
  }
`

const Th = styled.span<{ $align?: 'right' }>`
  font-size: 10px;
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.textFaint};
  text-align: ${({ $align }) => $align ?? 'left'};
`

const Row = styled.div<{ $isCurrent: boolean }>`
  display: grid;
  grid-template-columns: 56px 1fr 56px 72px;
  align-items: center;
  padding: ${tokens.spacing.md} ${tokens.spacing.xl};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.04)' : 'transparent'};
  border-left: 3px solid ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : 'transparent'};
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }

  @media (min-width: 768px) {
    grid-template-columns: 72px 1fr 72px 90px;
  }
`

const TierCell = styled.span<{ $isCurrent: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${({ $isCurrent }) =>
    $isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $isCurrent, $locked }) =>
    $isCurrent ? tokens.color.accent : $locked ? tokens.color.textFaint : tokens.color.text};
`

const PoolCell = styled.span<{ $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  color: ${({ $locked }) => ($locked ? tokens.color.textFaint : tokens.color.textMuted)};
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const VpHint = styled.span`
  font-size: 10px;
  color: ${tokens.color.accent};
  font-weight: ${tokens.font.weight.medium};
`

const NumCell = styled.span<{ $isCurrent: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ $isCurrent, $locked }) =>
    $isCurrent ? tokens.color.accent : $locked ? tokens.color.textFaint : tokens.color.text};
`

const PayoutCell = styled.span<{ $isCurrent: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.positive : tokens.color.textMuted};
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};
`

const Footer = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-top: 1px solid ${tokens.color.border};
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
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  line-height: 1.4;

  strong {
    color: ${tokens.color.text};
    font-weight: ${tokens.font.weight.semibold};
  }
`

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.border};
  overflow: hidden;
  max-width: 200px;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.accent};
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
  userEstimatedReward,
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
          Share the campaign to grow voting power — higher tiers mean more for everyone.
        </Subtitle>
      </Header>

      <Table role="table" aria-label="Tier comparison">
        <TableHead role="row">
          <Th>Tier</Th>
          <Th>Pool</Th>
          <Th $align="right">APY</Th>
          <Th $align="right">Payout</Th>
        </TableHead>

        {tiers.map((tier) => {
          const isCurrent = tier.index === currentTierIndex
          const locked = !tier.isUnlocked && !isCurrent
          const isNext = tier.index === currentTierIndex + 1
          const projected = projectPayout(
            userEstimatedReward,
            currentTier.poolSizeEns,
            tier.poolSizeEns,
          )

          return (
            <Row key={tier.index} $isCurrent={isCurrent} role="row">
              <TierCell $isCurrent={isCurrent} $locked={locked}>
                {isCurrent ? '→ ' : ''}Tier {tier.index + 1}
              </TierCell>
              <PoolCell $locked={locked}>
                <span>{formatPool(tier.poolSizeEns)} ENS</span>
                {isNext && !locked && (
                  <VpHint>{formatVpNeeded(tier.additionalVPNeeded)} VP to go</VpHint>
                )}
              </PoolCell>
              <NumCell $isCurrent={isCurrent} $locked={locked}>
                {tier.estimatedApyPct}%
              </NumCell>
              <PayoutCell $isCurrent={isCurrent} $locked={locked}>
                {isCurrent ? '+' : '~'}{formatPayout(projected)}
              </PayoutCell>
            </Row>
          )
        })}
      </Table>

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
