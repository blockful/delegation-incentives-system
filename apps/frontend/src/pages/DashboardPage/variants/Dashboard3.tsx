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
   4. Visual step ladder
   ═══════════════════════════════════════════════════════════ */

const LadderSection = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  overflow: hidden;
  background: ${tokens.color.surface};
  padding: ${tokens.spacing.lg};

  @media (min-width: 768px) {
    padding: ${tokens.spacing.xl};
  }
`

const LadderList = styled.div`
  display: flex;
  flex-direction: column;
`

const StepRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
`

const StepTrackCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: ${tokens.spacing.lg};
  flex-shrink: 0;
`

const StepCircle = styled.div<{ $variant: 'past' | 'current' | 'locked' }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid
    ${({ $variant }) =>
      $variant === 'current'
        ? tokens.color.accent
        : $variant === 'past'
          ? tokens.color.positive
          : tokens.color.textFaint};
  background: ${({ $variant }) =>
    $variant === 'current'
      ? tokens.color.accent
      : $variant === 'past'
        ? tokens.color.positive
        : 'transparent'};
  transition: background ${tokens.transition.fast}, border-color ${tokens.transition.fast};
`

const StepLine = styled.div<{ $variant: 'past' | 'current' | 'locked' }>`
  flex: 1;
  width: 2px;
  min-height: ${tokens.spacing.lg};
  background: ${({ $variant }) =>
    $variant === 'past'
      ? tokens.color.positive
      : $variant === 'current'
        ? tokens.color.accent
        : tokens.color.border};
`

const StepContent = styled.div`
  flex: 1;
  min-width: 0;
  padding-bottom: ${tokens.spacing.lg};
`

const StepHeader = styled.div<{ $variant: 'past' | 'current' | 'locked' }>`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $variant }) =>
    $variant === 'current'
      ? tokens.color.accent
      : $variant === 'past'
        ? tokens.color.text
        : tokens.color.textFaint};
  line-height: 1.3;
`

const StepTierLabel = styled.span`
  font-weight: ${tokens.font.weight.bold};
`

const StepPoolLabel = styled.span`
  font-weight: ${tokens.font.weight.medium};
  color: inherit;
`

const StepDots = styled.span`
  flex: 1;
  min-width: ${tokens.spacing.lg};
  border-bottom: 1px dotted ${tokens.color.border};
  margin-bottom: 3px;
`

const StepStats = styled.span`
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const YouAreHere = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.accent};
  white-space: nowrap;
`

const StepProgressArea = styled.div`
  margin-top: ${tokens.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const StepProgressText = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
`

const MiniProgressTrack = styled.div`
  height: 6px;
  border-radius: 3px;
  background: ${tokens.color.border};
  overflow: hidden;
  max-width: 200px;
`

const MiniProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 3px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min(Math.max($pct, 2), 100)}%;
  transition: width 0.5s ease;
`

const MiniProgressLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
`

/* ─── Share CTA ─── */

const ShareCta = styled.div`
  margin-top: ${tokens.spacing.md};
  padding-top: ${tokens.spacing.md};
  border-top: 1px solid ${tokens.color.border};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  align-items: center;
`

const ShareLink = styled(Link)`
  text-decoration: none;
  width: 100%;

  /* Make Thorin Button fill the link container */
  > button {
    width: 100%;
  }
`

const ShareHint = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  text-align: center;
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

export default function Dashboard3() {
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

      <TierStepLadder
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
        <InfoTooltip text="Your 6-month average ENS balance. Holding longer = earning more." />
      </BalanceLeft>
      <PayoutBadge>+{formatPayout(expectedPayout)} ENS this round</PayoutBadge>
    </BalanceRow>
  )
}

/* ─── 4. Visual step ladder ─── */

function TierStepLadder({
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
  const nextTierIndex = currentTierIndex + 1
  const nextTier = tierList[nextTierIndex]
  const isMaxTier = currentTierIndex >= tierList.length - 1

  const currentPool = parseFloat(currentTier.poolSizeEns) || 1
  const baseReward = parseFloat(userEstimatedReward) || 0

  const vpProgress = nextTier
    ? computeVpProgress(
        currentTier.requiredAVP,
        nextTier.requiredAVP,
        nextTier.additionalVPNeeded,
      )
    : 100

  return (
    <LadderSection>
      <LadderList>
        {tierList.map((tier, idx) => {
          const isCurrent = tier.index === currentTierIndex
          const isPast = tier.isUnlocked && !isCurrent
          const isLocked = !tier.isUnlocked && !isCurrent
          const isNextLocked = tier.index === nextTierIndex && isLocked
          const isLast = idx === tierList.length - 1

          const variant: 'past' | 'current' | 'locked' = isCurrent
            ? 'current'
            : isPast
              ? 'past'
              : 'locked'

          const tierPool = parseFloat(tier.poolSizeEns) || 0
          const projected = baseReward * (tierPool / currentPool)
          const payoutStr = formatPayout(projected.toString())
          const payoutPrefix = isCurrent ? '+' : '~'

          const vpNeededStr = formatVpNeeded(tier.additionalVPNeeded)

          return (
            <StepRow key={tier.index}>
              <StepTrackCol>
                <StepCircle $variant={variant} />
                {!isLast && (
                  <StepLine
                    $variant={
                      isPast
                        ? 'past'
                        : isCurrent
                          ? 'current'
                          : 'locked'
                    }
                  />
                )}
              </StepTrackCol>

              <StepContent>
                <StepHeader $variant={variant}>
                  <StepTierLabel>Tier {tier.index + 1}</StepTierLabel>
                  <StepPoolLabel>
                    &mdash; {formatPool(tier.poolSizeEns)} ENS pool
                  </StepPoolLabel>
                  <StepDots />
                  <StepStats>
                    {tier.estimatedApyPct}% APY &rarr; {payoutPrefix}
                    {payoutStr} ENS/mo
                  </StepStats>
                  {isCurrent && <YouAreHere>&larr; You are here</YouAreHere>}
                </StepHeader>

                {isNextLocked && vpNeededStr && (
                  <StepProgressArea>
                    <StepProgressText>
                      {vpNeededStr} more ENS needs to be delegated
                    </StepProgressText>
                    <MiniProgressTrack>
                      <MiniProgressFill $pct={vpProgress} />
                    </MiniProgressTrack>
                    <MiniProgressLabel>
                      {Math.round(vpProgress)}% there
                    </MiniProgressLabel>
                  </StepProgressArea>
                )}
              </StepContent>
            </StepRow>
          )
        })}
      </LadderList>

      {!isMaxTier && nextTier && (
        <ShareCta>
          <ShareLink to="/delegates">
            <Button
              size="small"
              colorStyle="bluePrimary"
              width="auto"
            >
              Help unlock Tier {nextTier.index + 1} &mdash; share with ENS holders &rarr;
            </Button>
          </ShareLink>
          <ShareHint>
            More delegation = higher tier = more rewards for everyone
          </ShareHint>
        </ShareCta>
      )}
    </LadderSection>
  )
}
