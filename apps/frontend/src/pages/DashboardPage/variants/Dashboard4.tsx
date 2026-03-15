/**
 * Dashboard variant 4 — "Goals dashboard"
 *
 * Gamified, progress-driven, motivational. Like a sales/goals dashboard
 * or fitness app. Progress rings, tier ladders, and strong CTAs to
 * encourage sharing and growing the delegation pool.
 */
import styled, { keyframes } from 'styled-components'
import { Navigate, Link } from 'react-router-dom'
import { Spinner, Button, Tag } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'

import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useDashboardData } from '../useDashboardData'

/* ═══════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════ */

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const bounceArrow = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
`

const ringFill = keyframes`
  from { stroke-dashoffset: var(--circumference); }
  to { stroke-dashoffset: var(--offset); }
`

/* ═══════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════ */

const Page = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
    gap: ${tokens.spacing['2xl']};
  }
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  animation: ${fadeInUp} 0.3s ease both;
`

const ErrorMsg = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`

/* ═══════════════════════════════════════════
   Section 1 — Goal hero
   ═══════════════════════════════════════════ */

const HeroSection = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  text-align: center;
`

const HeroStreaming = styled.span`
  display: block;
  font-size: ${tokens.font.size['4xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.positive};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  line-height: 1.1;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const HeroLabel = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
  margin-top: ${tokens.spacing.xs};
`

const HeroApyRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  margin-top: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const CurrentApy = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const NextApyArrow = styled.span`
  color: ${tokens.color.accent};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.lg};
  display: inline-flex;
  align-items: center;
  animation: ${bounceArrow} 1.2s ease infinite;
`

const NextApyText = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
  animation: ${pulse} 2.5s ease infinite;
`

const DelegateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  margin-top: ${tokens.spacing.lg};
`

const DelegateName = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ═══════════════════════════════════════════
   Section 2 — Progress ring
   ═══════════════════════════════════════════ */

const RingSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
`

const RingContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const RingLabel = styled.div`
  position: absolute;
  text-align: center;
`

const RingTierText = styled.span`
  display: block;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
`

const RingTierSub = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const RingProgressText = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.accent};
`

const RingVPNeeded = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  text-align: center;
  line-height: 1.5;
`

const ShareButton = styled(Button)`
  width: 100%;
`

/* ═══════════════════════════════════════════
   Section 3 — Tier ladder
   ═══════════════════════════════════════════ */

const LadderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const LadderTitle = styled.h3`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.textMuted};
  margin: 0;
`

const LadderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
`

const LadderItem = styled.div<{ $isCurrent: boolean; $isUnlocked: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  position: relative;
  background: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.surfaceAlt : 'transparent'};
  border-radius: ${tokens.radius.md};
  opacity: ${({ $isUnlocked, $isCurrent }) =>
    $isUnlocked || $isCurrent ? 1 : 0.7};
`

const LadderLine = styled.div`
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: ${tokens.color.border};
  z-index: 0;
`

const LadderMarker = styled.div<{ $isCurrent: boolean; $isUnlocked: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  z-index: 1;
  background: ${({ $isCurrent, $isUnlocked }) =>
    $isCurrent
      ? tokens.color.accent
      : $isUnlocked
        ? tokens.color.positive
        : tokens.color.border};
  border: 2px solid ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : tokens.color.surface};
  box-shadow: ${({ $isCurrent }) =>
    $isCurrent ? `0 0 0 3px ${tokens.color.lightBlue}` : 'none'};
`

const LadderContent = styled.div`
  flex: 1;
  min-width: 0;
`

const LadderTierRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
`

const LadderTierName = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : tokens.color.text};
`

const LadderPayout = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.positive : tokens.color.textMuted};
  white-space: nowrap;
`

const LadderIncrease = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.positive};
  white-space: nowrap;
`

const LadderApyLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const LadderLock = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textFaint};
  margin-left: ${tokens.spacing.xs};
`

/* ═══════════════════════════════════════════
   Section 4 — Round countdown
   ═══════════════════════════════════════════ */

const RoundSection = styled.div`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const RoundHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const RoundLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const RoundDays = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
`

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${tokens.color.surfaceAlt};
  border-radius: ${tokens.radius.pill};
  overflow: hidden;
  border: 1px solid ${tokens.color.border};
`

const ProgressBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: linear-gradient(90deg, ${tokens.color.blue}, #44B4E0);
  border-radius: ${tokens.radius.pill};
  transition: width 0.6s ease;
`

const RoundDates = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const RoundStatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const RoundStat = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};

  strong {
    color: ${tokens.color.text};
    font-weight: ${tokens.font.weight.semibold};
  }
`

const PayoutValue = styled.strong`
  color: ${tokens.color.positive} !important;
`

const TooltipWrapper = styled.span`
  position: relative;
  cursor: help;
  border-bottom: 1px dotted ${tokens.color.textFaint};

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    width: 240px;
    padding: ${tokens.spacing.sm} ${tokens.spacing.md};
    background: ${tokens.color.darkBlue};
    color: ${tokens.color.white};
    font-size: ${tokens.font.size.xs};
    font-weight: ${tokens.font.weight.normal};
    line-height: 1.5;
    border-radius: ${tokens.radius.sm};
    pointer-events: none;
    opacity: 0;
    transition: opacity ${tokens.transition.fast};
    z-index: 10;
    white-space: normal;
  }

  &:hover::after {
    opacity: 1;
  }
`

/* ═══════════════════════════════════════════
   Section 5 — Share CTA footer
   ═══════════════════════════════════════════ */

const ShareFooter = styled.div`
  background: ${tokens.color.accent};
  border-radius: ${tokens.radius.lg};
  padding: ${tokens.spacing.xl};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const ShareMessage = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.surface};
  line-height: 1.5;
`

const ShareActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const ShareActionButton = styled(Button)`
  && {
    background: ${tokens.color.surface};
    color: ${tokens.color.accent};

    &:hover {
      background: ${tokens.color.surfaceAlt};
    }
  }
`

const ShareLink = styled.a`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.surface};
  text-decoration: underline;
  opacity: 0.85;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 1;
  }
`

/* ═══════════════════════════════════════════
   Section 6 — Lottery
   ═══════════════════════════════════════════ */

const LotteryBanner = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border: 1px solid ${tokens.color.lightYellow};
  border-radius: ${tokens.radius.lg};
  background: linear-gradient(
    135deg,
    rgba(255, 247, 47, 0.08) 0%,
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
  font-size: 20px;
  flex-shrink: 0;
`

const LotteryText = styled.span`
  flex: 1;
  font-size: ${tokens.font.size.sm};
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

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function formatEns(value: string, decimals = 2): string {
  const num = parseFloat(value)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatVP(value: string): string {
  const num = Number(value) / 1e18
  if (isNaN(num) || num <= 0) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return Math.round(num).toString()
}

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  return num.toFixed(4)
}

function pctIncrease(current: number, target: number): number {
  if (current <= 0) return 0
  return Math.round(((target - current) / current) * 100)
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

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
  const currentTierIndex = tiers.currentTierIndex
  const currentTier = tiers.tiers[currentTierIndex]
  const nextTier = tiers.tiers.find((t) => t.index === currentTierIndex + 1)
  const currentPool = parseFloat(currentTier?.poolSizeEns ?? '0')
  const userReward = parseFloat(apy.estimatedMonthlyRewardEns)

  // Progress toward next tier (based on additional VP needed)
  const nextVPNeeded = nextTier ? parseFloat(nextTier.additionalVPNeeded) : 0
  const nextRequired = nextTier ? parseFloat(nextTier.requiredAVP) : 0
  const currentAVP = parseFloat(tiers.currentAVP)
  const progressToNext =
    nextRequired > 0
      ? Math.min(100, Math.max(0, (currentAVP / nextRequired) * 100))
      : 100

  return (
    <Page>
      <GoalHero
        earnedEns={apy.estimatedMonthlyRewardEns}
        apyPct={apy.estimatedApyPct}
        delegatedTo={delegatedTo}
        delegateEnsName={apy.delegatedToEnsName}
        delegateAvatarUrl={apy.delegatedToAvatarUrl}
        nextTierApyPct={nextTier?.estimatedApyPct ?? null}
        roundStartDate={round.startDate}
        roundEndDate={round.endDate}
      />

      <ProgressRing
        progress={progressToNext}
        currentTierIndex={currentTierIndex}
        nextTierIndex={nextTier ? nextTier.index : null}
        vpNeeded={nextVPNeeded}
      />

      <TierLadder
        tiers={tiers.tiers}
        currentTierIndex={currentTierIndex}
        currentPool={currentPool}
        userReward={userReward}
      />

      <RoundCountdown
        roundNumber={round.roundNumber}
        startDate={round.startDate}
        endDate={round.endDate}
        daysRemaining={round.daysRemaining}
        percentComplete={round.percentComplete}
        balanceEns={apy.currentBalanceEns}
        payoutEns={apy.estimatedMonthlyRewardEns}
      />

      <ShareCTAFooter />

      {apy.qualifiesForLottery && (
        <LotteryBanner to="/lottery">
          <LotteryIcon aria-hidden>🎟️</LotteryIcon>
          <LotteryText>
            Your <strong>{formatPayout(apy.estimatedMonthlyRewardEns)} ENS</strong>{' '}
            payout is below the 1 ENS minimum. It enters a{' '}
            <strong>10 ENS lottery pool</strong> drawn at round end.
          </LotteryText>
          <LotteryArrow aria-hidden>&rsaquo;</LotteryArrow>
        </LotteryBanner>
      )}
    </Page>
  )
}

/* ─── Goal hero ─── */

interface GoalHeroProps {
  earnedEns: string
  apyPct: string
  delegatedTo: `0x${string}`
  delegateEnsName: string | null
  delegateAvatarUrl: string | null
  nextTierApyPct: string | null
  roundStartDate: string
  roundEndDate: string
}

function GoalHero({
  earnedEns,
  apyPct,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  nextTierApyPct,
  roundStartDate,
  roundEndDate,
}: GoalHeroProps) {
  const { data: resolvedName } = useEnsName({
    address: delegatedTo,
    query: { enabled: !delegateEnsName },
  })
  const displayName =
    delegateEnsName ?? resolvedName ?? truncateAddress(delegatedTo)
  const streaming = useStreamingCounter(
    earnedEns,
    roundStartDate,
    roundEndDate,
  )

  const currentApyNum = parseFloat(apyPct)
  const nextApyNum = nextTierApyPct ? parseFloat(nextTierApyPct) : null
  const apyBump =
    nextApyNum !== null && currentApyNum > 0
      ? Math.round(((nextApyNum - currentApyNum) / currentApyNum) * 100)
      : null

  return (
    <HeroSection>
      <HeroStreaming>+{streaming} ENS</HeroStreaming>
      <HeroLabel>You're earning</HeroLabel>

      <HeroApyRow>
        <CurrentApy>{apyPct}% APY</CurrentApy>
        {nextTierApyPct && (
          <>
            <NextApyArrow>&rarr;</NextApyArrow>
            <NextApyText>
              Next tier: {nextTierApyPct}% APY
              {apyBump !== null && ` (+${apyBump}% more)`}
            </NextApyText>
          </>
        )}
      </HeroApyRow>

      <DelegateRow>
        <EnsAvatar
          address={delegatedTo}
          name={delegateEnsName ?? resolvedName ?? undefined}
          avatarUrl={delegateAvatarUrl ?? undefined}
          size={24}
        />
        <DelegateName>Delegating to {displayName}</DelegateName>
      </DelegateRow>
    </HeroSection>
  )
}

/* ─── Progress ring ─── */

interface ProgressRingProps {
  progress: number
  currentTierIndex: number
  nextTierIndex: number | null
  vpNeeded: number
}

function ProgressRing({
  progress,
  currentTierIndex,
  nextTierIndex,
  vpNeeded,
}: ProgressRingProps) {
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress / 100)

  const isMaxTier = nextTierIndex === null

  return (
    <RingSection>
      <RingContainer>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tokens.color.border}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tokens.color.accent}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <RingLabel>
          <RingTierText>Tier {currentTierIndex + 1}</RingTierText>
          <RingTierSub>Current</RingTierSub>
        </RingLabel>
      </RingContainer>

      {isMaxTier ? (
        <RingProgressText>Max tier reached!</RingProgressText>
      ) : (
        <>
          <RingProgressText>
            {Math.round(progress)}% to Tier {nextTierIndex! + 1}
          </RingProgressText>
          {vpNeeded > 0 && (
            <RingVPNeeded>
              Need +{formatVP(vpNeeded.toString())} more voting power
            </RingVPNeeded>
          )}
          <ShareButton
            as={Link}
            to="/delegates"
            colorStyle="bluePrimary"
            size="small"
          >
            🚀 Share &amp; Unlock Tier {nextTierIndex! + 1}
          </ShareButton>
        </>
      )}
    </RingSection>
  )
}

/* ─── Tier ladder ─── */

interface TierLadderProps {
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
  currentPool: number
  userReward: number
}

function TierLadder({
  tiers,
  currentTierIndex,
  currentPool,
  userReward,
}: TierLadderProps) {
  return (
    <LadderSection>
      <LadderTitle>What you could earn</LadderTitle>
      <LadderList>
        {tiers.map((tier, idx) => {
          const poolSize = parseFloat(tier.poolSizeEns)
          const projectedPayout =
            currentPool > 0 ? userReward * (poolSize / currentPool) : 0
          const increase = pctIncrease(userReward, projectedPayout)
          const isCurrent = tier.isCurrent
          const isLocked = !tier.isUnlocked && !tier.isCurrent

          return (
            <LadderItem
              key={tier.index}
              $isCurrent={isCurrent}
              $isUnlocked={tier.isUnlocked}
            >
              {idx < tiers.length - 1 && <LadderLine />}
              <LadderMarker
                $isCurrent={isCurrent}
                $isUnlocked={tier.isUnlocked}
              />
              <LadderContent>
                <LadderTierRow>
                  <LadderTierName $isCurrent={isCurrent}>
                    Tier {tier.index + 1}
                    {isCurrent && (
                      <Tag
                        size="small"
                        colorStyle="bluePrimary"
                        style={{ marginLeft: 8 }}
                      >
                        You
                      </Tag>
                    )}
                    {isLocked && <LadderLock>🔒</LadderLock>}
                  </LadderTierName>
                  <LadderPayout $isCurrent={isCurrent}>
                    ~{formatEns(projectedPayout.toString())} ENS/mo
                    {!isCurrent && increase > 0 && (
                      <LadderIncrease> (+{increase}%)</LadderIncrease>
                    )}
                  </LadderPayout>
                </LadderTierRow>
                <LadderApyLabel>{tier.estimatedApyPct}% APY</LadderApyLabel>
              </LadderContent>
            </LadderItem>
          )
        })}
      </LadderList>
    </LadderSection>
  )
}

/* ─── Round countdown ─── */

interface RoundCountdownProps {
  roundNumber: number
  startDate: string
  endDate: string
  daysRemaining: number
  percentComplete: number
  balanceEns: string
  payoutEns: string
}

function RoundCountdown({
  roundNumber,
  startDate,
  endDate,
  daysRemaining,
  percentComplete,
  balanceEns,
  payoutEns,
}: RoundCountdownProps) {
  return (
    <RoundSection>
      <RoundHeader>
        <RoundLabel>Round {roundNumber}</RoundLabel>
        <RoundDays>{daysRemaining}d left</RoundDays>
      </RoundHeader>

      <ProgressBarTrack>
        <ProgressBarFill $percent={percentComplete} />
      </ProgressBarTrack>

      <RoundDates>
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </RoundDates>

      <RoundStatsRow>
        <RoundStat>
          Balance:{' '}
          <strong>{formatEns(balanceEns, 0)} ENS</strong>{' '}
          <TooltipWrapper data-tooltip="Time-weighted average balance over 180 days. Hold longer, earn more.">
            &#9432;
          </TooltipWrapper>
        </RoundStat>
        <RoundStat>
          Expected: <PayoutValue>+{formatEns(payoutEns)} ENS</PayoutValue>
        </RoundStat>
      </RoundStatsRow>
    </RoundSection>
  )
}

/* ─── Share CTA footer ─── */

function ShareCTAFooter() {
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    'I\'m earning ENS rewards by delegating! Join the campaign and grow the pool for everyone.',
  )}&url=${encodeURIComponent(shareUrl)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl,
  )}&text=${encodeURIComponent(
    'I\'m earning ENS rewards by delegating! Join the campaign.',
  )}`

  return (
    <ShareFooter>
      <ShareMessage>
        Every new delegation grows the pool for everyone
      </ShareMessage>
      <ShareActions>
        <ShareActionButton
          as="a"
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
        >
          Share this campaign
        </ShareActionButton>
      </ShareActions>
      <ShareActions>
        <ShareLink
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Twitter
        </ShareLink>
        <ShareLink
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </ShareLink>
      </ShareActions>
    </ShareFooter>
  )
}
