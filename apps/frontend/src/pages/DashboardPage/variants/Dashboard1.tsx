import { Navigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { Button } from '@ensdomains/thorin'
import { DashboardPageSkeleton } from '@/components/shared/PageSkeletons'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { truncateAddress } from '@/utils/format'
import {
  formatBalance,
  formatPayout,
  formatPool,
  formatVpNeeded,
  formatShortDate,
  computeVpProgress,
} from '@/utils/dashboard'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useDashboardData } from '../useDashboardData'

/* ═══════════════════════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════════════════════ */

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  animation: ${fadeInUp} 0.35s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
    gap: ${tokens.spacing.lg};
  }
`

const ErrorMsg = styled.p`
  text-align: center;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`

/* ═══════════════════════════════════════════════════════════
   1. Compact earnings strip
   ═══════════════════════════════════════════════════════════ */

const Strip = styled.div`
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StripTopRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const EarnedValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.positive};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  line-height: 1.2;
`

const StripMeta = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
  white-space: nowrap;
`

const DelegateInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
`

const DelegateName = styled.span`
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ═══════════════════════════════════════════════════════════
   2. Round timeline
   ═══════════════════════════════════════════════════════════ */

const TimelineSection = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const TimelineHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const TimelineTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const TimelineDays = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
`

const TimelineTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: ${tokens.color.border};
  overflow: hidden;
  position: relative;
`

const TimelineFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min(Math.max($pct, 1), 100)}%;
  transition: width 0.6s ease;
`

const TimelineDates = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
`

const TimelinePct = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  text-align: center;
`

/* ═══════════════════════════════════════════════════════════
   3. Balance with TWAB tooltip
   ═══════════════════════════════════════════════════════════ */

const BalanceRow = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const BalanceLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  position: relative;
`

const BalanceValue = styled.span`
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  font-variant-numeric: tabular-nums;
`

const BalanceUnit = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
`

/* InfoTooltip component imported from @/components/shared/InfoTooltip */

const PayoutBadge = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.positive};
  white-space: nowrap;
`

/* ═══════════════════════════════════════════════════════════
   4. Tier progression table
   ═══════════════════════════════════════════════════════════ */

const TierSection = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  overflow: hidden;
  background: ${tokens.color.surface};
`

const TierTableEl = styled.div`
  width: 100%;
`

const TierHead = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr 56px 72px 1fr;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    grid-template-columns: 60px 1fr 72px 88px 1fr;
    padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  }
`

const Th = styled.span<{ $align?: 'right' }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
  color: ${tokens.color.textMuted};
  text-align: ${({ $align }) => $align ?? 'left'};
`

const TierRow = styled.div<{ $isCurrent: boolean }>`
  display: grid;
  grid-template-columns: 52px 1fr 56px 72px 1fr;
  align-items: center;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.05)' : 'transparent'};
  border-left: 3px solid
    ${({ $isCurrent }) =>
      $isCurrent ? tokens.color.accent : 'transparent'};
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }

  @media (min-width: 768px) {
    grid-template-columns: 60px 1fr 72px 88px 1fr;
    padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  }
`

const TierCell = styled.span<{ $current: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${({ $current }) =>
    $current ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${({ $current, $locked }) =>
    $current
      ? tokens.color.accent
      : $locked
        ? tokens.color.textFaint
        : tokens.color.text};
`

const PoolCell = styled.span<{ $locked: boolean }>`
  font-size: ${tokens.font.size.xs};
  color: ${({ $locked }) =>
    $locked ? tokens.color.textFaint : tokens.color.textMuted};
`

const NumCell = styled.span<{ $current: boolean; $locked: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ $current, $locked }) =>
    $current
      ? tokens.color.accent
      : $locked
        ? tokens.color.textFaint
        : tokens.color.text};
`

const StatusCell = styled.span<{ $locked: boolean }>`
  font-size: ${tokens.font.size.xs};
  color: ${({ $locked }) =>
    $locked ? tokens.color.textFaint : tokens.color.positive};
  font-weight: ${tokens.font.weight.medium};
  text-align: right;
`

const TierFooter = styled.div`
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border-top: 1px solid ${tokens.color.border};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${tokens.spacing.md} ${tokens.spacing.xl};
  }
`

const TierFooterInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const TierFooterText = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
`

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.border};
  overflow: hidden;
  max-width: 180px;
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

/* ═══════════════════════════════════════════════════════════
   Helpers — uses shared formatters from @/utils/dashboard
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export default function Dashboard1() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  if (loading) {
    return <DashboardPageSkeleton compact />
  }

  if (error) {
    return (
      <Page>
        <ErrorMsg>Failed to load dashboard: {error}</ErrorMsg>
      </Page>
    )
  }

  if (!data) return null

  const { apr, tiers, round } = data
  const delegatedTo = (apr.delegatedTo ?? address) as `0x${string}`

  return (
    <Page>
      <EarningsStrip
        earnedEns={apr.estimatedMonthlyRewardEns}
        aprPct={apr.estimatedAprPct}
        tierIndex={tiers.currentTierIndex}
        delegatedTo={delegatedTo}
        delegateEnsName={apr.delegatedToEnsName}
        delegateAvatarUrl={apr.delegatedToAvatarUrl}
        roundStartDate={round.startDate}
        roundEndDate={round.endDate}
      />

      <RoundTimeline
        roundNumber={round.roundNumber}
        startDate={round.startDate}
        endDate={round.endDate}
        daysRemaining={round.daysRemaining}
        percentComplete={round.percentComplete}
      />

      <BalanceStrip
        balanceEns={apr.currentBalanceEns}
        expectedPayout={apr.estimatedMonthlyRewardEns}
      />

      <TierProgression
        tiers={tiers.tiers}
        currentTierIndex={tiers.currentTierIndex}
        userEstimatedReward={apr.estimatedMonthlyRewardEns}
      />

    </Page>
  )
}

/* ─── 1. Earnings strip ─── */

function EarningsStrip({
  earnedEns,
  aprPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  roundStartDate,
  roundEndDate,
}: {
  earnedEns: string
  aprPct: string
  tierIndex: number
  delegatedTo: string
  delegateEnsName: string | null
  delegateAvatarUrl: string | null
  roundStartDate: string
  roundEndDate: string
}) {
  const { data: resolvedEnsName } = useEnsName({
    address: delegatedTo as `0x${string}`,
    query: { enabled: !delegateEnsName },
  })

  const displayName =
    delegateEnsName ?? resolvedEnsName ?? truncateAddress(delegatedTo)
  const streamingEarnings = useStreamingCounter(
    earnedEns,
    roundStartDate,
    roundEndDate,
  )

  return (
    <Strip>
      <StripTopRow>
        <EarnedValue>+{streamingEarnings} ENS</EarnedValue>
        <StripMeta>
          {aprPct}% APR &middot; Tier {tierIndex + 1}
        </StripMeta>
      </StripTopRow>
      <DelegateInfo>
        <EnsAvatar
          address={delegatedTo}
          name={delegateEnsName ?? resolvedEnsName ?? undefined}
          avatarUrl={delegateAvatarUrl ?? undefined}
          size={16}
        />
        <DelegateName>Delegating to {displayName}</DelegateName>
      </DelegateInfo>
    </Strip>
  )
}

/* ─── 2. Round timeline ─── */

function RoundTimeline({
  roundNumber,
  startDate,
  endDate,
  daysRemaining,
  percentComplete,
}: {
  roundNumber: number
  startDate: string
  endDate: string
  daysRemaining: number
  percentComplete: number
}) {
  return (
    <TimelineSection>
      <TimelineHeader>
        <TimelineTitle>Round {roundNumber}</TimelineTitle>
        <TimelineDays>{daysRemaining}d left</TimelineDays>
      </TimelineHeader>
      <TimelineTrack>
        <TimelineFill $pct={percentComplete} />
      </TimelineTrack>
      <TimelineDates>
        <span>{formatShortDate(startDate)}</span>
        <TimelinePct>{percentComplete}% complete</TimelinePct>
        <span>{formatShortDate(endDate)}</span>
      </TimelineDates>
    </TimelineSection>
  )
}

/* ─── 3. Balance with TWAB tooltip ─── */

function BalanceStrip({
  balanceEns,
  expectedPayout,
}: {
  balanceEns: string
  expectedPayout: string
}) {
  return (
    <BalanceRow>
      <BalanceLeft>
        <InfoTooltip text="Your average ENS balance over the last 180 days. The longer you hold, the bigger your share of the reward pool.">
          <BalanceValue>{formatBalance(balanceEns)}</BalanceValue>
          <BalanceUnit>ENS</BalanceUnit>
        </InfoTooltip>
      </BalanceLeft>
      <PayoutBadge>+{formatPayout(expectedPayout)} ENS this round</PayoutBadge>
    </BalanceRow>
  )
}

/* ─── 4. Tier progression ─── */

function TierProgression({
  tiers: tierList,
  currentTierIndex,
  userEstimatedReward,
}: {
  tiers: {
    index: number
    poolSizeEns: string
    estimatedAprPct: string
    additionalVPNeeded: string
    requiredTotalVP: string
    isCurrent: boolean
    isUnlocked: boolean
  }[]
  currentTierIndex: number
  userEstimatedReward: string
}) {
  const currentTier = tierList[currentTierIndex]
  const nextTier = tierList[currentTierIndex + 1]
  const isMaxTier = currentTierIndex >= tierList.length - 1
  const vpProgress = nextTier
    ? computeVpProgress(
        currentTier.requiredTotalVP,
        nextTier.requiredTotalVP,
        nextTier.additionalVPNeeded,
      )
    : 100

  const currentPool = parseFloat(currentTier.poolSizeEns) || 1
  const baseReward = parseFloat(userEstimatedReward) || 0

  return (
    <TierSection>
      <TierTableEl>
        <TierHead>
          <Th>Tier</Th>
          <Th>Pool</Th>
          <Th $align="right">APR</Th>
          <Th $align="right">Payout</Th>
          <Th $align="right">To unlock</Th>
        </TierHead>

        {tierList.map((tier) => {
          const isCurrent = tier.index === currentTierIndex
          const locked = !tier.isUnlocked && !isCurrent

          const tierPool = parseFloat(tier.poolSizeEns) || 0
          const projected = baseReward * (tierPool / currentPool)
          const payoutDisplay =
            projected < 0.01
              ? '<0.01'
              : projected >= 10
                ? projected.toFixed(1)
                : projected.toFixed(2)

          let status: string
          if (isCurrent) {
            status = 'You'
          } else if (tier.isUnlocked) {
            status = 'Reached'
          } else {
            const vpStr = formatVpNeeded(tier.additionalVPNeeded)
            status = vpStr ? `${vpStr} ENS to go` : 'Locked'
          }

          return (
            <TierRow key={tier.index} $isCurrent={isCurrent}>
              <TierCell $current={isCurrent} $locked={locked}>
                Tier {tier.index + 1}
              </TierCell>
              <PoolCell $locked={locked}>
                {formatPool(tier.poolSizeEns)} ENS
              </PoolCell>
              <NumCell $current={isCurrent} $locked={locked}>
                {tier.estimatedAprPct}%
              </NumCell>
              <NumCell $current={isCurrent} $locked={locked}>
                {isCurrent ? `+${payoutDisplay}` : `~${payoutDisplay}`}
              </NumCell>
              <StatusCell $locked={locked}>{status}</StatusCell>
            </TierRow>
          )
        })}
      </TierTableEl>

      {!isMaxTier && nextTier && (
        <TierFooter>
          <TierFooterInfo>
            <TierFooterText>
              <strong>{formatVpNeeded(nextTier.additionalVPNeeded)} more ENS</strong>{' '}
              needs to be delegated to unlock Tier {nextTier.index + 1} at{' '}
              {nextTier.estimatedAprPct}% APR
            </TierFooterText>
            <ProgressTrack>
              <ProgressFill $pct={vpProgress} />
            </ProgressTrack>
          </TierFooterInfo>
          <ShareLink to="/voters">
            <Button size="small" colorStyle="bluePrimary" width="auto">
              Share &amp; earn more
            </Button>
          </ShareLink>
        </TierFooter>
      )}
    </TierSection>
  )
}
