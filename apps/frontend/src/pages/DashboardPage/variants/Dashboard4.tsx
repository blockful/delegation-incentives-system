import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { useEnsName } from 'wagmi'
import { Spinner, Button } from '@ensdomains/thorin'
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
  projectPayout,
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

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
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
   4. Now vs Next comparison cards
   ═══════════════════════════════════════════════════════════ */

const ComparisonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const ComparisonCard = styled.div<{ $variant: 'now' | 'next' }>`
  background: ${({ $variant }) =>
    $variant === 'now' ? tokens.color.surface : tokens.color.surface};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'next' ? tokens.color.accent : tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  ${({ $variant }) =>
    $variant === 'next'
      ? `box-shadow: ${tokens.shadow.sm};`
      : ''}
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${tokens.spacing.xs};
`

const CardLabel = styled.span<{ $variant: 'now' | 'next' }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ $variant }) =>
    $variant === 'now' ? tokens.color.textMuted : tokens.color.accent};
`

const PercentBadge = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.positive};
  background: rgba(0, 124, 35, 0.08);
  padding: ${tokens.spacing.xs} ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  white-space: nowrap;
`

const CardStatRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const CardStatLine = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.text};
  line-height: 1.4;
`

const CardStatValue = styled.span`
  font-weight: ${tokens.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const CardStatMuted = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
`

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  padding-top: ${tokens.spacing.xs};
`

const ProgressTrack = styled.div`
  height: 6px;
  border-radius: 3px;
  background: ${tokens.color.border};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 3px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min(Math.max($pct, 2), 100)}%;
  transition: width 0.5s ease;
`

const ProgressLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-variant-numeric: tabular-nums;
`

const NeededLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.text};
`

const ShareLink = styled(Link)`
  text-decoration: none;
  align-self: flex-start;
`

/* ═══════════════════════════════════════════════════════════
   5. Collapsed tier list toggle
   ═══════════════════════════════════════════════════════════ */

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.xs};
  width: 100%;
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  cursor: pointer;
  transition:
    color ${tokens.transition.fast},
    border-color ${tokens.transition.fast};

  &:hover {
    color: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }
`

const ToggleChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  font-size: ${tokens.font.size.sm};
  transition: transform ${tokens.transition.fast};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

const TierList = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  overflow: hidden;
  background: ${tokens.color.surface};
`

const TierListItem = styled.div<{ $isCurrent: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  background: ${({ $isCurrent }) =>
    $isCurrent ? 'rgba(0, 128, 188, 0.05)' : 'transparent'};
  border-left: 3px solid
    ${({ $isCurrent }) =>
      $isCurrent ? tokens.color.accent : 'transparent'};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.border};
  }
`

const TierItemLeft = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.text};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  font-variant-numeric: tabular-nums;
`

const TierItemRight = styled.span<{ $locked: boolean }>`
  font-size: ${tokens.font.size.xs};
  color: ${({ $locked }) =>
    $locked ? tokens.color.textFaint : tokens.color.positive};
  font-weight: ${tokens.font.weight.medium};
`

/* ═══════════════════════════════════════════════════════════
   6. Share section
   ═══════════════════════════════════════════════════════════ */

const ShareSection = styled.div`
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  align-items: center;
  text-align: center;
`

const ShareText = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
`

const ShareButtonLink = styled(Link)`
  text-decoration: none;
`

/* ═══════════════════════════════════════════════════════════
   7. Lottery banner
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

export default function Dashboard4() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  return <DashboardContent address={wallet.address} />
}

function DashboardContent({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  if (loading) {
    return (
      <Page>
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      </Page>
    )
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

      <NowVsNextComparison
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

/* ─── 1. Earnings strip ─── */

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
          {apyPct}% APY &middot; Level {tierIndex + 1}
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
        <BalanceValue>{formatBalance(balanceEns)}</BalanceValue>
        <BalanceUnit>ENS</BalanceUnit>
        <InfoTooltip text="Average of your ENS balance over 6 months. Hold longer, earn more." />
      </BalanceLeft>
      <PayoutBadge>+{formatPayout(expectedPayout)} ENS this round</PayoutBadge>
    </BalanceRow>
  )
}

/* ─── 4. Now vs Next comparison ─── */

function NowVsNextComparison({
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
  const [showAllLevels, setShowAllLevels] = useState(false)

  const currentTier = tierList[currentTierIndex]
  const nextTier = tierList[currentTierIndex + 1]
  const isMaxLevel = currentTierIndex >= tierList.length - 1

  const currentPayout = formatPayout(userEstimatedReward)
  const currentPool = formatPool(currentTier.poolSizeEns)

  const nextPayout = nextTier
    ? formatPayout(projectPayout(userEstimatedReward, currentTier.poolSizeEns, nextTier.poolSizeEns))
    : null
  const nextPool = nextTier ? formatPool(nextTier.poolSizeEns) : null

  const vpProgress = nextTier
    ? computeVpProgress(
        currentTier.requiredAVP,
        nextTier.requiredAVP,
        nextTier.additionalVPNeeded,
      )
    : 100

  const vpNeededStr = nextTier ? formatVpNeeded(nextTier.additionalVPNeeded) : ''

  // Calculate percentage increase from current to next level payout
  const currentPayoutNum = parseFloat(userEstimatedReward) || 0
  const nextPayoutNum = nextTier
    ? parseFloat(projectPayout(userEstimatedReward, currentTier.poolSizeEns, nextTier.poolSizeEns)) || 0
    : 0
  const pctIncrease =
    currentPayoutNum > 0 && nextPayoutNum > 0
      ? Math.round(((nextPayoutNum - currentPayoutNum) / currentPayoutNum) * 100)
      : 0

  return (
    <ComparisonWrapper>
      {/* NOW card */}
      <ComparisonCard $variant="now">
        <CardHeader>
          <CardLabel $variant="now">
            Now — Level {currentTierIndex + 1}
          </CardLabel>
        </CardHeader>
        <CardStatRow>
          <CardStatLine>
            You're earning <CardStatValue>{currentTier.estimatedApyPct}% APY</CardStatValue>
          </CardStatLine>
          <CardStatLine>
            Expected payout: <CardStatValue>+{currentPayout} ENS</CardStatValue>
          </CardStatLine>
          <CardStatMuted>Pool: {currentPool} ENS</CardStatMuted>
        </CardStatRow>
      </ComparisonCard>

      {/* NEXT card */}
      {!isMaxLevel && nextTier && (
        <ComparisonCard $variant="next">
          <CardHeader>
            <CardLabel $variant="next">
              Next — Level {nextTier.index + 1}
            </CardLabel>
            {pctIncrease > 0 && (
              <PercentBadge>+{pctIncrease}% ↑</PercentBadge>
            )}
          </CardHeader>
          <CardStatRow>
            <CardStatLine>
              You'd earn <CardStatValue>{nextTier.estimatedApyPct}% APY</CardStatValue>
            </CardStatLine>
            <CardStatLine>
              Expected payout: <CardStatValue>~{nextPayout} ENS</CardStatValue>
            </CardStatLine>
            <CardStatMuted>Pool: {nextPool} ENS</CardStatMuted>
          </CardStatRow>
          <ProgressSection>
            <ProgressTrack>
              <ProgressFill $pct={vpProgress} />
            </ProgressTrack>
            <ProgressLabel>{Math.round(vpProgress)}% of the way</ProgressLabel>
            {vpNeededStr && (
              <NeededLabel>{vpNeededStr} more ENS delegation needed</NeededLabel>
            )}
          </ProgressSection>
          <ShareLink to="/delegates">
            <Button size="small" colorStyle="bluePrimary" width="auto">
              Spread the word →
            </Button>
          </ShareLink>
        </ComparisonCard>
      )}

      {/* Collapsed tier list */}
      <ToggleButton
        type="button"
        onClick={() => setShowAllLevels((v) => !v)}
        aria-expanded={showAllLevels}
      >
        {showAllLevels ? 'Hide all 7 levels' : 'See all 7 levels'}
        <ToggleChevron $open={showAllLevels} aria-hidden>
          ▾
        </ToggleChevron>
      </ToggleButton>

      {showAllLevels && (
        <TierList>
          {tierList.map((tier) => {
            const isCurrent = tier.index === currentTierIndex
            const locked = !tier.isUnlocked && !isCurrent
            const projected = formatPayout(
              projectPayout(userEstimatedReward, currentTier.poolSizeEns, tier.poolSizeEns),
            )

            return (
              <TierListItem key={tier.index} $isCurrent={isCurrent}>
                <TierItemLeft>
                  Level {tier.index + 1} &middot; {tier.estimatedApyPct}% APY &middot;{' '}
                  {isCurrent ? `+${projected}` : `~${projected}`} ENS
                </TierItemLeft>
                <TierItemRight $locked={locked}>
                  {isCurrent ? 'You' : tier.isUnlocked ? '✓' : '🔒'}
                </TierItemRight>
              </TierListItem>
            )
          })}
        </TierList>
      )}

      {/* Share section */}
      <ShareSection>
        <ShareText>
          Every new delegation helps everyone earn more
        </ShareText>
        <ShareButtonLink to="/delegates">
          <Button size="small" colorStyle="bluePrimary" width="auto">
            Spread the word
          </Button>
        </ShareButtonLink>
      </ShareSection>
    </ComparisonWrapper>
  )
}
