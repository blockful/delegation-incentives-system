import { useState } from 'react'
import styled, { css } from 'styled-components'
import { Link, Navigate } from 'react-router-dom'
import { Spinner, Button, Tag } from '@ensdomains/thorin'
import { useEnsName } from 'wagmi'
import { tokens } from '@/styles/tokens'
import { fadeInUp } from '@/styles/primitives'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { truncateAddress } from '@/utils/format'
import { useStreamingCounter } from '@/hooks/useStreamingCounter'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useDashboardData } from '../useDashboardData'
import type { TierEntry } from '@/api/types'

/* ─── Helpers ─── */

function formatBalance(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num)) return '0'
  return Math.round(num).toLocaleString('en-US')
}

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  if (num < 0.01) return '<0.01'
  if (num >= 10) return num.toFixed(1)
  return num.toFixed(2)
}

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/* ─── Layout ─── */

const Page = styled.div`
  max-width: 480px;
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing.lg};
    gap: ${tokens.spacing.xl};
  }
`

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`

const ErrorMessage = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`

/* ─── Shared Card ─── */

const cardBase = css`
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.xl};
  box-shadow: ${tokens.shadow.sm};
  transition:
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};
`

const Card = styled.div`
  ${cardBase}
  padding: ${tokens.spacing['2xl']};
`

const CardCompact = styled.div`
  ${cardBase}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
`

/* ─── 1. Earnings Card ─── */

const EarningsValue = styled.span`
  font-size: 40px;
  font-weight: ${tokens.font.weight.extrabold};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  background: linear-gradient(135deg, ${tokens.color.blue} 0%, #44B4E0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (min-width: 768px) {
    font-size: 48px;
  }
`

const EarningsSubtitle = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  margin-top: ${tokens.spacing.xs};
  display: block;
`

const EarningsApyRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  margin-top: ${tokens.spacing.md};
`

const ApyLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
`

/* ─── 2. Delegate Card ─── */

const DelegateInner = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const DelegateLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const DelegateName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DelegateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

/* ─── 3. Round Progress Card ─── */

const RoundHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const RoundTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const DaysLeft = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.spacing.xs};
`

const DaysBig = styled.span`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1;
`

const DaysUnit = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  font-weight: ${tokens.font.weight.medium};
`

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  margin-top: ${tokens.spacing.md};
`

const ProgressDate = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.textMuted};
  flex-shrink: 0;
`

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.border};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min(Math.max($pct, 2), 100)}%;
  transition: width 0.5s ease;
`

const PayoutExpected = styled.div`
  margin-top: ${tokens.spacing.md};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.positive};
  font-weight: ${tokens.font.weight.semibold};
`

/* ─── 4. Balance Card ─── */

const BalanceBig = styled.span`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
`

const BalanceUnit = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
  margin-left: ${tokens.spacing.xs};
`

const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const InfoIcon = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  padding: 0;
  margin-left: ${tokens.spacing.xs};
  line-height: 1;
`

const TooltipBubble = styled.div`
  position: absolute;
  bottom: calc(100% + ${tokens.spacing.sm});
  left: 50%;
  transform: translateX(-50%);
  background: ${tokens.color.darkBlue};
  color: ${tokens.color.surface};
  font-size: ${tokens.font.size.xs};
  line-height: 1.4;
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.md};
  white-space: normal;
  width: 240px;
  box-shadow: ${tokens.shadow.lg};
  z-index: 10;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: ${tokens.color.darkBlue};
  }
`

const BalanceHint = styled.span`
  display: block;
  margin-top: ${tokens.spacing.xs};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

/* ─── 5. Tier Cards ─── */

const TierStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const TierCard = styled.div<{ $isCurrent: boolean; $locked: boolean }>`
  ${cardBase}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border-left: 3px solid ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.accent : 'transparent'};
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};
`

const TierCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const TierLabel = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $isCurrent }) => ($isCurrent ? tokens.color.accent : tokens.color.text)};
`

const TierApyBadge = styled.span<{ $isCurrent: boolean }>`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $isCurrent }) => ($isCurrent ? tokens.color.accent : tokens.color.textMuted)};
  font-variant-numeric: tabular-nums;
`

const TierYouAreHere = styled.span`
  display: inline-block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.accent};
  margin-bottom: ${tokens.spacing.xs};
`

const TierMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: ${tokens.spacing.sm};
`

const TierMetaLine = styled.span<{ $color?: string }>`
  font-size: ${tokens.font.size.sm};
  color: ${({ $color }) => $color ?? tokens.color.textMuted};
`

const TierCta = styled.div`
  ${cardBase}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  text-align: center;
`

const ShareCtaLink = styled(Link)`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.accent};
  text-decoration: none;
  transition: opacity ${tokens.transition.fast};

  &:hover {
    opacity: 0.8;
  }
`

/* ─── 6. Lottery Banner ─── */

const LotteryCard = styled(Link)`
  ${cardBase}
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  text-decoration: none;
  color: inherit;
  border: 1px solid ${tokens.color.lightYellow};
  background: linear-gradient(135deg, rgba(255, 247, 47, 0.05) 0%, ${tokens.color.surface} 100%);

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

/* ─── Tooltip Component ─── */

function TwabTooltip() {
  const [visible, setVisible] = useState(false)

  return (
    <TooltipWrapper>
      <InfoIcon
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        aria-label="Balance info"
      >
        &#9432;
      </InfoIcon>
      {visible && (
        <TooltipBubble>
          Your balance is averaged over 180 days. Longer holding = bigger share.
        </TooltipBubble>
      )}
    </TooltipWrapper>
  )
}

/* ─── Main Component ─── */

export default function Dashboard2() {
  const wallet = useWalletState()

  if (wallet.status === 'disconnected') {
    return <Navigate to="/" replace />
  }

  return <Dashboard2Content address={wallet.address} />
}

function Dashboard2Content({ address }: { address: `0x${string}` }) {
  const { data, loading, error } = useDashboardData(address)

  if (loading) {
    return (
      <Page>
        <LoadingWrapper><Spinner /></LoadingWrapper>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <ErrorMessage>Failed to load dashboard data: {error}</ErrorMessage>
      </Page>
    )
  }

  if (!data) return null

  const { apy, tiers, round } = data
  const delegatedTo = (apy.delegatedTo ?? address) as `0x${string}`
  const currentTier = tiers.tiers[tiers.currentTierIndex]

  return (
    <Page>
      <EarningsCard
        earnedEns={apy.estimatedMonthlyRewardEns}
        apyPct={apy.estimatedApyPct}
        tierIndex={tiers.currentTierIndex}
        roundStartDate={round.startDate}
        roundEndDate={round.endDate}
      />

      <DelegateCard
        address={delegatedTo}
        ensName={apy.delegatedToEnsName ?? undefined}
        avatarUrl={apy.delegatedToAvatarUrl ?? undefined}
      />

      <RoundProgressCard
        roundNumber={round.roundNumber}
        daysRemaining={round.daysRemaining}
        percentComplete={round.percentComplete}
        startDate={round.startDate}
        endDate={round.endDate}
        expectedPayout={apy.estimatedMonthlyRewardEns}
      />

      <BalanceCard balanceEns={apy.currentBalanceEns} />

      <TierCards
        tiers={tiers.tiers}
        currentTierIndex={tiers.currentTierIndex}
        userEstimatedReward={apy.estimatedMonthlyRewardEns}
        currentPoolEns={currentTier.poolSizeEns}
      />

      {apy.qualifiesForLottery && (
        <LotteryCard to="/lottery">
          <LotteryIcon aria-hidden>&#127915;</LotteryIcon>
          <LotteryText>
            Your <strong>{formatPayout(apy.estimatedMonthlyRewardEns)} ENS</strong> payout is below
            the 1 ENS minimum. It enters a <strong>10 ENS lottery pool</strong> drawn at round end.
          </LotteryText>
          <LotteryArrow aria-hidden>&rsaquo;</LotteryArrow>
        </LotteryCard>
      )}
    </Page>
  )
}

/* ─── Section Components ─── */

function EarningsCard({
  earnedEns,
  apyPct,
  tierIndex,
  roundStartDate,
  roundEndDate,
}: {
  earnedEns: string
  apyPct: string
  tierIndex: number
  roundStartDate: string
  roundEndDate: string
}) {
  const streamingEarnings = useStreamingCounter(earnedEns, roundStartDate, roundEndDate)

  return (
    <Card>
      <EarningsValue>+{streamingEarnings}</EarningsValue>
      <EarningsSubtitle>ENS earned this round</EarningsSubtitle>
      <EarningsApyRow>
        <ApyLabel>Earning at {apyPct}% APY</ApyLabel>
        <Tag colorStyle="bluePrimary">Tier {tierIndex + 1}</Tag>
      </EarningsApyRow>
    </Card>
  )
}

function DelegateCard({
  address,
  ensName,
  avatarUrl,
}: {
  address: string
  ensName?: string
  avatarUrl?: string
}) {
  const { data: resolvedEnsName } = useEnsName({
    address: address as `0x${string}`,
    query: { enabled: !ensName },
  })
  const displayName = ensName ?? resolvedEnsName ?? truncateAddress(address)

  return (
    <CardCompact>
      <DelegateInner>
        <EnsAvatar
          address={address}
          name={ensName ?? resolvedEnsName ?? undefined}
          avatarUrl={avatarUrl}
          size={36}
        />
        <DelegateInfo>
          <DelegateLabel>Delegating to</DelegateLabel>
          <DelegateName>{displayName}</DelegateName>
        </DelegateInfo>
      </DelegateInner>
    </CardCompact>
  )
}

function RoundProgressCard({
  roundNumber,
  daysRemaining,
  percentComplete,
  startDate,
  endDate,
  expectedPayout,
}: {
  roundNumber: number
  daysRemaining: number
  percentComplete: number
  startDate: string
  endDate: string
  expectedPayout: string
}) {
  return (
    <Card>
      <RoundHeader>
        <RoundTitle>Round {roundNumber}</RoundTitle>
        <DaysLeft>
          <DaysBig>{daysRemaining}d</DaysBig>
          <DaysUnit>left</DaysUnit>
        </DaysLeft>
      </RoundHeader>
      <ProgressRow>
        <ProgressDate>{formatDate(startDate)}</ProgressDate>
        <ProgressTrack>
          <ProgressFill $pct={percentComplete} />
        </ProgressTrack>
        <ProgressDate>{formatDate(endDate)}</ProgressDate>
      </ProgressRow>
      <PayoutExpected>Expected payout: +{formatPayout(expectedPayout)} ENS</PayoutExpected>
    </Card>
  )
}

function BalanceCard({ balanceEns }: { balanceEns: string }) {
  return (
    <Card>
      <div>
        <BalanceBig>{formatBalance(balanceEns)}</BalanceBig>
        <BalanceUnit>ENS</BalanceUnit>
      </div>
      <BalanceHint>
        180-day time-weighted average
        <TwabTooltip />
      </BalanceHint>
    </Card>
  )
}

function TierCards({
  tiers,
  currentTierIndex,
  userEstimatedReward,
  currentPoolEns,
}: {
  tiers: TierEntry[]
  currentTierIndex: number
  userEstimatedReward: string
  currentPoolEns: string
}) {
  const currentPool = parseFloat(currentPoolEns) || 1
  const baseReward = parseFloat(userEstimatedReward) || 0

  return (
    <TierStack>
      {tiers.map((tier) => {
        const isCurrent = tier.index === currentTierIndex
        const isNext = tier.index === currentTierIndex + 1
        const locked = !tier.isUnlocked && !isCurrent

        const tierPool = parseFloat(tier.poolSizeEns) || 0
        const projectedReward = baseReward * (tierPool / currentPool)
        const payoutDisplay =
          projectedReward < 0.01
            ? '<0.01'
            : projectedReward >= 10
              ? projectedReward.toFixed(1)
              : projectedReward.toFixed(2)

        if (isCurrent) {
          return (
            <TierCard key={tier.index} $isCurrent $locked={false}>
              <TierYouAreHere>You are here</TierYouAreHere>
              <TierCardHeader>
                <TierLabel $isCurrent>Tier {tier.index + 1}</TierLabel>
                <TierApyBadge $isCurrent>{tier.estimatedApyPct}% APY</TierApyBadge>
              </TierCardHeader>
              <TierMeta>
                <TierMetaLine>Pool: {formatPool(tier.poolSizeEns)} ENS</TierMetaLine>
                <TierMetaLine $color={tokens.color.positive}>
                  Projected payout: +{payoutDisplay} ENS
                </TierMetaLine>
              </TierMeta>
            </TierCard>
          )
        }

        if (isNext && !tier.isUnlocked) {
          const vpNeeded = formatVpNeeded(tier.additionalVPNeeded)
          return (
            <TierCard key={tier.index} $isCurrent={false} $locked={false}>
              <TierCardHeader>
                <TierLabel $isCurrent={false}>Tier {tier.index + 1}</TierLabel>
                <TierApyBadge $isCurrent={false}>{tier.estimatedApyPct}% APY</TierApyBadge>
              </TierCardHeader>
              <TierMeta>
                <TierMetaLine>
                  You would earn ~{payoutDisplay} ENS
                </TierMetaLine>
                {vpNeeded && (
                  <TierMetaLine $color={tokens.color.accent}>
                    Need +{vpNeeded} VP to unlock
                  </TierMetaLine>
                )}
              </TierMeta>
            </TierCard>
          )
        }

        return (
          <TierCard key={tier.index} $isCurrent={false} $locked={locked}>
            <TierCardHeader>
              <TierLabel $isCurrent={false}>Tier {tier.index + 1}</TierLabel>
              <TierApyBadge $isCurrent={false}>{tier.estimatedApyPct}% APY</TierApyBadge>
            </TierCardHeader>
          </TierCard>
        )
      })}

      <TierCta>
        <ShareCtaLink to="/delegates">
          Share &amp; help everyone earn more &rarr;
        </ShareCtaLink>
      </TierCta>
    </TierStack>
  )
}
