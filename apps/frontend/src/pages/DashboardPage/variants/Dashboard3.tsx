/**
 * Dashboard variant 3 — "Split layout"
 *
 * Balanced two-column on desktop, elegant single column on mobile.
 * Swiss editorial typography. Clean, confident ENS Labs aesthetic
 * inspired by app.ens.domains.
 */
import styled, { css } from 'styled-components'
import { Navigate, Link } from 'react-router-dom'
import { Spinner, Button, Tag } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'

import { tokens } from '@/styles/tokens'
import { fadeInUp, gradientTextStyles } from '@/styles/primitives'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useDashboardData } from '../useDashboardData'

/* ═══════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════ */

const Page = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: ${tokens.spacing['3xl']};
  }
`

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    grid-column: 1;
    grid-row: 1 / -1;
  }
`

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    grid-column: 2;
    grid-row: 1 / -1;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  animation: ${fadeInUp} 0.3s ease both;
`

const ErrorContainer = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`

/* ═══════════════════════════════════════════
   Section 1 — Earnings + Delegate header
   ═══════════════════════════════════════════ */

const HeaderSection = styled.div`
  padding-bottom: ${tokens.spacing['2xl']};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
`

const StreamingValue = styled.span`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  line-height: 1.1;
  ${gradientTextStyles}

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const ApyBadge = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
  white-space: nowrap;
`

const DelegateRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  margin-top: ${tokens.spacing.md};
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

const DelegateMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex: 1;
  min-width: 0;
`

/* ═══════════════════════════════════════════
   Section 2 — Round timeline
   ═══════════════════════════════════════════ */

const TimelineSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const TimelineTrack = styled.div`
  position: relative;
  width: 100%;
  height: 32px;
  background: ${tokens.color.surfaceAlt};
  border-radius: ${tokens.radius.pill};
  overflow: hidden;
  border: 1px solid ${tokens.color.border};
`

const TimelineFill = styled.div<{ $percent: number }>`
  position: absolute;
  inset: 0;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  background: linear-gradient(90deg, ${tokens.color.blue}, #44B4E0);
  border-radius: ${tokens.radius.pill};
  transition: width 0.6s ease;
`

const TimelineOverlay = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  letter-spacing: 0.04em;
  z-index: 1;
  pointer-events: none;
`

const TimelineLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const StatsStrip = styled.div`
  display: flex;
  gap: ${tokens.spacing.xl};
  margin-top: ${tokens.spacing.xs};
`

const StripStat = styled.div`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};

  strong {
    color: ${tokens.color.text};
    font-weight: ${tokens.font.weight.semibold};
  }
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
   Section 3 — Tier progression
   ═══════════════════════════════════════════ */

const TierSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const TierSectionTitle = styled.h3`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.textMuted};
  margin: 0;
`

const TierBar = styled.div<{
  $widthPct: number
  $isCurrent: boolean
  $isNext: boolean
}>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.sm};
  min-height: 36px;
  position: relative;
  transition: background ${tokens.transition.base};

  ${({ $isCurrent }) =>
    $isCurrent &&
    css`
      background: linear-gradient(90deg, ${tokens.color.blue}, #44B4E0);
      color: ${tokens.color.surface};
    `}

  ${({ $isNext }) =>
    $isNext &&
    css`
      border: 1.5px dashed ${tokens.color.accent};
      background: transparent;
    `}

  ${({ $isCurrent, $isNext }) =>
    !$isCurrent &&
    !$isNext &&
    css`
      background: ${tokens.color.surfaceAlt};
      border: 1px solid ${tokens.color.border};
    `}
`

const TierBarInner = styled.div<{ $widthPct: number }>`
  width: ${({ $widthPct }) => $widthPct}%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const TierLabel = styled.span<{ $current?: boolean }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  color: ${({ $current }) => ($current ? tokens.color.surface : tokens.color.text)};
`

const TierApyLabel = styled.span<{ $current?: boolean }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  white-space: nowrap;
  color: ${({ $current }) =>
    $current ? 'rgba(255,255,255,0.85)' : tokens.color.textMuted};
  margin-left: auto;
`

const YouMarker = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.surface};
  white-space: nowrap;
`

const NextTierDetail = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  line-height: 1.5;
  margin-top: ${tokens.spacing.xs};
  display: block;
`

const TierCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  margin-top: ${tokens.spacing.md};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
  text-decoration: none;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 0.75;
  }
`

/* ═══════════════════════════════════════════
   Section 4 — Lottery banner
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

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

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
    return (
      <Page>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <ErrorContainer>Failed to load dashboard: {error}</ErrorContainer>
      </Page>
    )
  }

  if (!data) return null

  const { apy, tiers, round } = data
  const delegatedTo = (apy.delegatedTo ?? address) as `0x${string}`
  const currentTierIndex = tiers.currentTierIndex
  const currentPool = parseFloat(
    tiers.tiers[currentTierIndex]?.poolSizeEns ?? '0',
  )
  const userReward = parseFloat(apy.estimatedMonthlyRewardEns)
  const maxPoolSize = Math.max(
    ...tiers.tiers.map((t) => parseFloat(t.poolSizeEns)),
    1,
  )

  return (
    <Page>
      <LeftColumn>
        <EarningsHeader
          earnedEns={apy.estimatedMonthlyRewardEns}
          apyPct={apy.estimatedApyPct}
          delegatedTo={delegatedTo}
          delegateEnsName={apy.delegatedToEnsName}
          delegateAvatarUrl={apy.delegatedToAvatarUrl}
          tierIndex={currentTierIndex}
          roundStartDate={round.startDate}
          roundEndDate={round.endDate}
        />
        <RoundTimeline
          roundNumber={round.roundNumber}
          startDate={round.startDate}
          endDate={round.endDate}
          daysRemaining={round.daysRemaining}
          percentComplete={round.percentComplete}
          balanceEns={apy.currentBalanceEns}
          payoutEns={apy.estimatedMonthlyRewardEns}
        />
      </LeftColumn>

      <RightColumn>
        <TierProgression
          tiers={tiers.tiers}
          currentTierIndex={currentTierIndex}
          currentPool={currentPool}
          userReward={userReward}
          maxPoolSize={maxPoolSize}
        />
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
      </RightColumn>
    </Page>
  )
}

/* ─── Earnings header ─── */

interface EarningsHeaderProps {
  earnedEns: string
  apyPct: string
  delegatedTo: `0x${string}`
  delegateEnsName: string | null
  delegateAvatarUrl: string | null
  tierIndex: number
  roundStartDate: string
  roundEndDate: string
}

function EarningsHeader({
  earnedEns,
  apyPct,
  delegatedTo,
  delegateEnsName,
  delegateAvatarUrl,
  tierIndex,
  roundStartDate,
  roundEndDate,
}: EarningsHeaderProps) {
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

  return (
    <HeaderSection>
      <HeaderRow>
        <StreamingValue>+{streaming} ENS</StreamingValue>
        <ApyBadge>{apyPct}% APY</ApyBadge>
      </HeaderRow>
      <DelegateRow>
        <EnsAvatar
          address={delegatedTo}
          name={delegateEnsName ?? resolvedName ?? undefined}
          avatarUrl={delegateAvatarUrl ?? undefined}
          size={24}
        />
        <DelegateMeta>
          <DelegateName>Delegating to {displayName}</DelegateName>
          <Tag size="small" colorStyle="bluePrimary">
            Tier {tierIndex + 1}
          </Tag>
        </DelegateMeta>
      </DelegateRow>
    </HeaderSection>
  )
}

/* ─── Round timeline ─── */

interface RoundTimelineProps {
  roundNumber: number
  startDate: string
  endDate: string
  daysRemaining: number
  percentComplete: number
  balanceEns: string
  payoutEns: string
}

function RoundTimeline({
  roundNumber,
  startDate,
  endDate,
  daysRemaining,
  percentComplete,
  balanceEns,
  payoutEns,
}: RoundTimelineProps) {
  return (
    <TimelineSection>
      <TimelineTrack>
        <TimelineFill $percent={percentComplete} />
        <TimelineOverlay>
          Round {roundNumber} &middot; {daysRemaining}d left
        </TimelineOverlay>
      </TimelineTrack>
      <TimelineLabels>
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </TimelineLabels>
      <StatsStrip>
        <StripStat>
          Balance:{' '}
          <strong>
            {formatEns(balanceEns, 0)} ENS
          </strong>{' '}
          <TooltipWrapper
            data-tooltip="Time-weighted average balance over 180 days. Longer holding = bigger share of the reward pool."
          >
            &#9432;
          </TooltipWrapper>
        </StripStat>
        <StripStat>
          Payout: <strong>+{formatEns(payoutEns)} ENS</strong>
        </StripStat>
      </StatsStrip>
    </TimelineSection>
  )
}

/* ─── Tier progression ─── */

interface TierProgressionProps {
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
  maxPoolSize: number
}

function TierProgression({
  tiers,
  currentTierIndex,
  currentPool,
  userReward,
  maxPoolSize,
}: TierProgressionProps) {
  const nextTier = tiers.find((t) => t.index === currentTierIndex + 1)

  return (
    <TierSection>
      <TierSectionTitle>Tier Progression</TierSectionTitle>
      {tiers.map((tier) => {
        const poolSize = parseFloat(tier.poolSizeEns)
        const widthPct = Math.max(25, (poolSize / maxPoolSize) * 100)
        const isCurrent = tier.isCurrent
        const isNext = tier.index === currentTierIndex + 1
        const projectedPayout =
          currentPool > 0
            ? userReward * (poolSize / currentPool)
            : 0

        return (
          <div key={tier.index}>
            <TierBar
              $widthPct={widthPct}
              $isCurrent={isCurrent}
              $isNext={isNext}
            >
              <TierBarInner $widthPct={widthPct}>
                <TierLabel $current={isCurrent}>
                  Tier {tier.index + 1}
                  {isCurrent && <YouMarker> &larr; You</YouMarker>}
                </TierLabel>
                <TierApyLabel $current={isCurrent}>
                  {tier.estimatedApyPct}% APY
                  {(isCurrent || isNext) && ` · ~${formatEns(projectedPayout.toString())} ENS`}
                </TierApyLabel>
              </TierBarInner>
            </TierBar>
            {isNext && (
              <NextTierDetail>
                +{formatVP(tier.additionalVPNeeded)} VP to unlock &middot;{' '}
                {tier.estimatedApyPct}% APY &middot; ~
                {formatEns(projectedPayout.toString())} ENS payout
              </NextTierDetail>
            )}
          </div>
        )
      })}
      <TierCta to="/delegates">
        Share the campaign to grow voting power &rarr;
      </TierCta>
    </TierSection>
  )
}
