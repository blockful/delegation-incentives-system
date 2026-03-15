import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import type { TierEntry } from '@/api/types'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
  userEstimatedReward: string
}

const Wrapper = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  overflow: hidden;
  background: ${tokens.color.surface};
`

const Header = styled.div`
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.border};

  @media (min-width: 768px) {
    padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']};
  }
`

const HeaderTitle = styled.div`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  margin-bottom: 2px;
`

const HeaderSub = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

/* ─── Table ─── */

const Table = styled.div`
  width: 100%;
`

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 72px 1fr 80px 80px;
  padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    grid-template-columns: 90px 1fr 100px 100px;
    padding: ${tokens.spacing.sm} ${tokens.spacing['2xl']};
  }
`

const Th = styled.span<{ $align?: 'right' }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.textMuted};
  text-align: ${({ $align }) => $align ?? 'left'};
`

const Row = styled.div<{ $isCurrent: boolean }>`
  display: grid;
  grid-template-columns: 72px 1fr 80px 80px;
  align-items: center;
  padding: ${tokens.spacing.md} ${tokens.spacing.xl};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.05)' : 'transparent'};
  border-left: 3px solid ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : 'transparent'};
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }

  @media (min-width: 768px) {
    grid-template-columns: 90px 1fr 100px 100px;
    padding: ${tokens.spacing.md} ${tokens.spacing['2xl']};
  }
`

const TierCell = styled.span<{ $isCurrent: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${({ $isCurrent }) =>
    $isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $isCurrent, $locked }) =>
    $isCurrent ? tokens.color.accent : $locked ? tokens.color.textFaint : tokens.color.text};
`

const PoolCell = styled.span<{ $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  color: ${({ $locked }) => ($locked ? tokens.color.textFaint : tokens.color.textMuted)};
`

const NumCell = styled.span<{ $isCurrent: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ $isCurrent, $locked }) =>
    $isCurrent ? tokens.color.accent : $locked ? tokens.color.textFaint : tokens.color.text};
`

/* ─── Next tier CTA ─── */

const NextTierBar = styled.div`
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-top: 1px solid ${tokens.color.border};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${tokens.spacing.lg} ${tokens.spacing['2xl']};
  }
`

const NextTierInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const NextTierText = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
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
`

/* ─── Helpers ─── */

function formatPool(ens: string): string {
  const num = parseFloat(ens)
  if (num >= 1000) return `${Math.round(num / 1000)}K`
  return Math.round(num).toString()
}

function formatVpNeeded(vpWei: string): string {
  const num = Number(vpWei) / 1e18
  if (num <= 0) return ''
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return Math.round(num).toString()
}

function computeVpProgress(currentTier: TierEntry, nextTier: TierEntry | undefined): number {
  if (!nextTier) return 100
  const currentRequired = Number(currentTier.requiredAVP) / 1e18
  const nextRequired = Number(nextTier.requiredAVP) / 1e18
  const additional = Number(nextTier.additionalVPNeeded) / 1e18
  const span = nextRequired - currentRequired
  if (span <= 0) return 100
  const progress = ((span - additional) / span) * 100
  return Math.max(0, Math.min(100, progress))
}

export function TierTable({
  tiers,
  currentTierIndex,
  userEstimatedReward,
}: TierTableProps) {
  const nextTier = tiers[currentTierIndex + 1]
  const currentTier = tiers[currentTierIndex]
  const isMaxTier = currentTierIndex >= tiers.length - 1
  const vpProgress = computeVpProgress(currentTier, nextTier)

  return (
    <Wrapper>
      <Header>
        <HeaderTitle>Reward Tiers</HeaderTitle>
        <HeaderSub>
          Share the campaign to grow delegated VP and unlock higher tiers for everyone.
        </HeaderSub>
      </Header>

      <Table>
        <TableHead>
          <Th>Tier</Th>
          <Th>Pool</Th>
          <Th $align="right">APY</Th>
          <Th $align="right">Payout</Th>
        </TableHead>

        {tiers.map((tier) => {
          const isCurrent = tier.index === currentTierIndex
          const locked = !tier.isUnlocked && !isCurrent

          // Estimate what the user would earn at this tier
          // Simple ratio: userReward × (tierPool / currentPool)
          const currentPool = parseFloat(currentTier.poolSizeEns) || 1
          const tierPool = parseFloat(tier.poolSizeEns) || 0
          const baseReward = parseFloat(userEstimatedReward) || 0
          const projectedReward = baseReward * (tierPool / currentPool)
          const payoutDisplay = projectedReward < 0.01
            ? '<0.01'
            : projectedReward >= 10
              ? projectedReward.toFixed(1)
              : projectedReward.toFixed(2)

          return (
            <Row key={tier.index} $isCurrent={isCurrent}>
              <TierCell $isCurrent={isCurrent} $locked={locked}>
                {isCurrent ? `→ Tier ${tier.index + 1}` : `Tier ${tier.index + 1}`}
              </TierCell>
              <PoolCell $locked={locked}>
                {formatPool(tier.poolSizeEns)} ENS
                {locked && nextTier && tier.index === currentTierIndex + 1
                  ? ` · ${formatVpNeeded(tier.additionalVPNeeded)} VP to go`
                  : ''
                }
              </PoolCell>
              <NumCell $isCurrent={isCurrent} $locked={locked}>
                {tier.estimatedApyPct}%
              </NumCell>
              <NumCell $isCurrent={isCurrent} $locked={locked}>
                {isCurrent ? `+${payoutDisplay}` : `~${payoutDisplay}`}
              </NumCell>
            </Row>
          )
        })}
      </Table>

      {!isMaxTier && nextTier && (
        <NextTierBar>
          <NextTierInfo>
            <NextTierText>
              <strong>{formatVpNeeded(nextTier.additionalVPNeeded)} VP</strong> needed for Tier {nextTier.index + 1} at {nextTier.estimatedApyPct}% APY
            </NextTierText>
            <ProgressTrack>
              <ProgressFill $pct={vpProgress} />
            </ProgressTrack>
          </NextTierInfo>
          <ShareLink to="/delegates">
            <Button size="small" colorStyle="bluePrimary" width="auto">
              Share &amp; grow the pool
            </Button>
          </ShareLink>
        </NextTierBar>
      )}
    </Wrapper>
  )
}
