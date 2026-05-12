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
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useDashboardData } from '../useDashboardData'
import {
  formatBalance,
  formatPayout,
  formatPool,
  formatVpNeeded,
  formatShortDate,
  computeVpProgress,
  projectPayout,
} from '@/utils/dashboard'

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

const PayoutBadge = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.positive};
  white-space: nowrap;
`

/* ═══════════════════════════════════════════════════════════
   4. Tier progression table (4-column: Tier, Pool, APY, Payout)
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
  grid-template-columns: 52px 1fr 56px 80px;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceAlt};

  @media (min-width: 768px) {
    grid-template-columns: 60px 1fr 72px 96px;
    padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  }
`

const Th = styled.span<{ $align?: 'right' }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${tokens.color.textMuted};
  text-align: ${({ $align }) => $align ?? 'left'};
`

const TierRow = styled.div<{ $isCurrent: boolean }>`
  display: grid;
  grid-template-columns: 52px 1fr 56px 80px;
  align-items: center;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.05)' : 'transparent'};
  border-left: 3px solid
    ${({ $isCurrent }) =>
      $isCurrent ? tokens.color.accent : 'transparent'};
  transition: background ${tokens.transition.fast};

  @media (min-width: 768px) {
    grid-template-columns: 60px 1fr 72px 96px;
    padding: ${tokens.spacing.sm} ${tokens.spacing.xl};
  }
`

const TierHintRow = styled.div`
  padding: 0 ${tokens.spacing.lg} ${tokens.spacing.sm};
  border-left: 3px solid transparent;

  @media (min-width: 768px) {
    padding: 0 ${tokens.spacing.xl} ${tokens.spacing.sm};
  }
`

const TierHintText = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.4;
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

const TierRowGroup = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }
`

const TierFooter = styled.div`
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border-top: 1px solid ${tokens.color.border};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};

  @media (min-width: 768px) {
    padding: ${tokens.spacing.md} ${tokens.spacing.xl};
  }
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

const InviteCtaWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const ShareLink = styled(Link)`
  text-decoration: none;
  display: block;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
  }
`

const InviteSubtext = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  text-align: center;

  @media (min-width: 768px) {
    text-align: left;
  }
`

/* ═══════════════════════════════════════════════════════════
   5. Lottery banner
   ═══════════════════════════════════════════════════════════ */

const LotteryBanner = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border: 1px solid ${tokens.color.lightYellow};
  border-radius: ${tokens.radius.md};
  background: linear-gradient(
    135deg,
    rgba(255, 247, 47, 0.05) 0%,
    ${tokens.color.surface} 100%
  );
  text-decoration: none;
  color: inherit;
  transition:
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};

  &:hover {
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
  }
`

const LotteryIcon = styled.span`
  font-size: 18px;
  flex-shrink: 0;
`

const LotteryText = styled.span`
  flex: 1;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.text};
  line-height: 1.4;

  strong {
    font-weight: ${tokens.font.weight.semibold};
  }
`

const LotteryArrow = styled.span`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.textFaint};
`

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export default function Dashboard2() {
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

  const { apy, tiers, round } = data
  const delegatedTo = (apy.delegatedTo ?? address) as `0x${string}`

  return (
    <Page>
      <EarningsStrip
        earnedEns={apy.estimatedMonthlyRewardEns}
        apyPct={apy.estimatedApyPct}
        tierIndex={tiers.currentTierIndex}
        delegatedTo={delegatedTo}
        delegateEnsName={apy.delegatedToEnsName}
        delegateAvatarUrl={apy.delegatedToAvatarUrl}
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
        balanceEns={apy.currentBalanceEns}
        expectedPayout={apy.estimatedMonthlyRewardEns}
      />

      <TierProgression
        tiers={tiers.tiers}
        currentTierIndex={tiers.currentTierIndex}
        userEstimatedReward={apy.estimatedMonthlyRewardEns}
      />

      {apy.qualifiesForLottery && (
        <LotteryBanner to="/lottery">
          <LotteryIcon aria-hidden>🎟️</LotteryIcon>
          <LotteryText>
            Your <strong>{formatPayout(apy.estimatedMonthlyRewardEns)} ENS</strong> payout is below
            the 1 ENS minimum. It enters a <strong>10 ENS lottery pool</strong> drawn at round end.
          </LotteryText>
          <LotteryArrow aria-hidden>&rsaquo;</LotteryArrow>
        </LotteryBanner>
      )}
    </Page>
  )
}

/* --- 1. Earnings strip --- */

function EarningsStrip({
  earnedEns,
  apyPct,
  tierIndex,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  roundStartDate,
  roundEndDate,
}: {
  earnedEns: string
  apyPct: string
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
          {apyPct}% APY &middot; Tier {tierIndex + 1}
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

/* --- 2. Round timeline --- */

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

/* --- 3. Balance with TWAB tooltip --- */

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
        <BalanceValue>{formatBalance(balanceEns)}</BalanceValue>
        <BalanceUnit>ENS</BalanceUnit>
        <InfoTooltip text="This is your average ENS balance over the last 6 months. The longer you hold, the more you earn." />
      </BalanceLeft>
      <PayoutBadge>+{formatPayout(expectedPayout)} ENS this round</PayoutBadge>
    </BalanceRow>
  )
}

/* --- 4. Tier progression (invite framing) --- */

function TierProgression({
  tiers: tierList,
  currentTierIndex,
  userEstimatedReward,
}: {
  tiers: {
    index: number
    poolSizeEns: string
    estimatedApyPct: string
    additionalVPNeeded: string
    requiredAVP: string
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
        currentTier.requiredAVP,
        nextTier.requiredAVP,
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
          <Th $align="right">APY</Th>
          <Th $align="right">Your Payout</Th>
        </TierHead>

        {tierList.map((tier) => {
          const isCurrent = tier.index === currentTierIndex
          const locked = !tier.isUnlocked && !isCurrent

          const projected = projectPayout(
            userEstimatedReward,
            currentTier.poolSizeEns,
            tier.poolSizeEns,
          )
          const projectedNum = parseFloat(projected)
          const payoutDisplay =
            projectedNum < 0.01
              ? '<0.01'
              : projectedNum >= 10
                ? projectedNum.toFixed(1)
                : projectedNum.toFixed(2)

          const vpStr = locked ? formatVpNeeded(tier.additionalVPNeeded) : ''

          return (
            <TierRowGroup key={tier.index}>
              <TierRow $isCurrent={isCurrent}>
                <TierCell $current={isCurrent} $locked={locked}>
                  Tier {tier.index + 1}
                </TierCell>
                <PoolCell $locked={locked}>
                  {formatPool(tier.poolSizeEns)} ENS
                </PoolCell>
                <NumCell $current={isCurrent} $locked={locked}>
                  {tier.estimatedApyPct}%
                </NumCell>
                <NumCell $current={isCurrent} $locked={locked}>
                  {isCurrent ? `+${payoutDisplay}` : `~${payoutDisplay}`}
                </NumCell>
              </TierRow>
              {locked && vpStr && (
                <TierHintRow>
                  <TierHintText>
                    ↑ Invite friends to delegate ~{vpStr} more ENS to unlock
                  </TierHintText>
                </TierHintRow>
              )}
            </TierRowGroup>
          )
        })}
      </TierTableEl>

      {!isMaxTier && nextTier && (
        <TierFooter>
          <TierFooterText>
            If <strong>{formatVpNeeded(nextTier.additionalVPNeeded)}</strong> more
            ENS gets delegated by the community, everyone moves to Tier{' '}
            {nextTier.index + 1} and earns {nextTier.estimatedApyPct}% APY. Share
            this link to help!
          </TierFooterText>
          <ProgressTrack>
            <ProgressFill $pct={vpProgress} />
          </ProgressTrack>
          <InviteCtaWrapper>
            <ShareLink to="/delegates">
              <Button size="small" colorStyle="bluePrimary" width="auto">
                Invite friends to delegate →
              </Button>
            </ShareLink>
            <InviteSubtext>
              Every new delegation grows the reward pool for everyone
            </InviteSubtext>
          </InviteCtaWrapper>
        </TierFooter>
      )}
    </TierSection>
  )
}
