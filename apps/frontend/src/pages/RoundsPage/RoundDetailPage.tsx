import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faCoins,
  faHourglassHalf,
  faLayerGroup,
  faMagnifyingGlass,
  faTrophy,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { api, ApiClientError } from '@/api'
import type {
  AddressRoundReward,
  LotteryBucketDetail,
  LotteryDetail,
  LotteryEntryDetail,
  RewardRank,
  RewardStatus,
  RoundDetailResponse,
  RoundStatus,
} from '@/api/types'
import { RoundDetailPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { CopyableAddress } from '@/components/shared/CopyableAddress'
import { CopyChip } from '@/components/shared/CopyChip'
import { tokens, ErrorMessage } from '@/styles'
import { formatEnsAmount, formatUtcMonthRange, truncateAddress } from '@/utils/format'
import { AddressLookupForm } from './components/AddressLookupForm'
import {
  buildRoundDetailFallback,
  buildRoundListFromCurrentRound,
} from './roundFallback'

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  min-width: 0;
`

const TopNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${tokens.color.blue};
  font-weight: ${tokens.font.weight.bold};
  font-size: ${tokens.font.size.base};
  text-decoration: none;
  transition: gap ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 12px;
    height: 12px;
  }

  &:hover {
    text-decoration: none;
    gap: 12px;
  }
`

const RoundNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const navButtonStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color ${tokens.transition.fast},
    color ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 10px;
    height: 10px;
  }
`

const RoundNavButton = styled(Link)`
  ${navButtonStyles};

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }
`

const DisabledRoundNavButton = styled.span`
  ${navButtonStyles};
  color: ${tokens.color.textSubtle};
  opacity: 0.6;
`

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
`

const EyebrowPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid ${tokens.color.white};
  border-radius: 14px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const EyebrowSep = styled.span`
  color: ${tokens.color.textSubtle};
`

const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0.55); }
  70%  { box-shadow: 0 0 0 6px rgba(25, 156, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0); }
`

const StatusDot = styled.span<{ $status: RoundStatus }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: ${({ $status }) =>
    $status === 'live' ? tokens.color.positiveEmphasis : tokens.color.textSubtle};

  ${({ $status }) =>
    $status === 'live'
      ? css`
          animation: ${pulseRing} 2s ease-out infinite;
        `
      : ''}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  text-align: center;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: 68px;
  }
`

const Description = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  text-align: center;
  max-width: 640px;
  text-wrap: pretty;
`

const StatusPill = styled.span<{ $status: RoundStatus | RewardStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  white-space: nowrap;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.bg
      : $status === 'paid'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.positiveEmphasis
      : $status === 'paid'
        ? tokens.color.blue
        : tokens.color.darkGray};
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const StatTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const StatValue = styled.span<{ $tone?: 'default' | 'positive' }>`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'positive' ? tokens.color.positiveEmphasis : tokens.color.darkBlue};
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`

const StatIconBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${tokens.color.textSubtle};
  font-size: 18px;
`

const StatLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const StatSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textSubtle};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
`

const WideSectionHeader = styled(SectionHeader)``

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SectionLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RowCount = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  @media (max-width: 720px) {
    display: block;
  }
`

const TableWrap = styled.div`
  width: 100%;
  max-width: 680px;
`

const WideTableWrap = styled(TableWrap)`
  max-width: 840px;
`

const Thead = styled.thead`
  @media (max-width: 720px) {
    display: none;
  }
`

const Tbody = styled.tbody`
  @media (max-width: 720px) {
    display: grid;
    gap: ${tokens.spacing.sm};
  }
`

const highlightPulse = keyframes`
  0%   { background: ${tokens.color.lightBlueOpacity}; }
  100% { background: transparent; }
`

const Row = styled.tr<{ $highlighted?: boolean }>`
  @media (max-width: 720px) {
    display: grid;
    border: 1px solid ${tokens.color.borderLight};
    border-radius: ${tokens.radius.sm};
    overflow: hidden;
  }

  ${({ $highlighted }) =>
    $highlighted &&
    css`
      background: ${tokens.color.lightBlueOpacity};
      animation: ${highlightPulse} 1500ms ease-out;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
`

const Th = styled.th`
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  text-align: left;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const Td = styled.td`
  padding: ${tokens.spacing.md};
  color: ${tokens.color.darkBlue};
  border-bottom: 1px solid ${tokens.color.borderLight};
  vertical-align: middle;
  overflow-wrap: anywhere;

  @media (max-width: 720px) {
    display: grid;
    grid-template-columns: minmax(82px, 34%) minmax(0, 1fr);
    gap: ${tokens.spacing.md};
    padding: ${tokens.spacing.sm} ${tokens.spacing.md};

    &::before {
      content: attr(data-label);
      color: ${tokens.color.darkGray};
      font-size: ${tokens.font.size.sm};
      font-weight: ${tokens.font.weight.semibold};
    }

    &:last-child {
      border-bottom: 0;
    }
  }
`

const AddressText = styled.span`
  font-variant-numeric: tabular-nums;
`

const RewardValue = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const EmptyState = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
`

const TableNote = styled.p`
  margin: ${tokens.spacing.sm} 0 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.5;
`

const AddressLotteryWrapper = styled.div`
  width: 100%;
`

const AddressLotteryAddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  padding-top: ${tokens.spacing.md};
  border-top: 1px solid ${tokens.color.borderLight};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

/* ─── Result strip (Rounds-page idiom) ─── */

type ResultTone = 'success' | 'warning' | 'neutral' | 'danger' | 'pending'

const TONE_PALETTE: Record<
  ResultTone,
  { bg: string; border: string; iconBg: string; iconFg: string; titleColor: string }
> = {
  success: {
    bg: tokens.color.status.success.bg,
    border: tokens.color.status.success.border,
    iconBg: tokens.color.positiveEmphasis,
    iconFg: tokens.color.white,
    titleColor: tokens.color.positiveEmphasis,
  },
  warning: {
    bg: tokens.color.lightOrange,
    border: tokens.color.orange,
    iconBg: tokens.color.orange,
    iconFg: tokens.color.white,
    titleColor: tokens.color.orange,
  },
  neutral: {
    bg: tokens.color.bgSubtle,
    border: tokens.color.borderLight,
    iconBg: tokens.color.darkGray,
    iconFg: tokens.color.white,
    titleColor: tokens.color.darkBlue,
  },
  danger: {
    bg: tokens.color.lightOrange,
    border: tokens.color.orange,
    iconBg: tokens.color.orange,
    iconFg: tokens.color.white,
    titleColor: tokens.color.orange,
  },
  pending: {
    bg: tokens.color.lightBlueOpacity,
    border: tokens.color.lightBlue,
    iconBg: tokens.color.blue,
    iconFg: tokens.color.white,
    titleColor: tokens.color.blue,
  },
}

const ResultStrip = styled.div<{ $tone: ResultTone }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${({ $tone }) => TONE_PALETTE[$tone].bg};
  border: 1px solid ${({ $tone }) => TONE_PALETTE[$tone].border};
`

const ResultIcon = styled.span<{ $tone: ResultTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: ${({ $tone }) => TONE_PALETTE[$tone].iconBg};
  color: ${({ $tone }) => TONE_PALETTE[$tone].iconFg};
  font-size: 16px;
  flex-shrink: 0;
`

const ResultBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`

const ResultTitle = styled.span<{ $tone: ResultTone }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) => TONE_PALETTE[$tone].titleColor};
  line-height: 1.4;
`

const ResultText = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`

const ResultMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 8px;
`

const ResultMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ResultMetricLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const ResultMetricValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  overflow-wrap: anywhere;
`

/* ─── Methodology card ─── */

const MethodologyCard = styled.div`
  display: grid;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  width: 100%;
  max-width: 840px;
`

const MethodologyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 220px) minmax(0, 1fr) auto;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.sm} 0;
  border-bottom: 1px solid ${tokens.color.borderLight};

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    align-items: flex-start;
  }
`

const MethodologyRowLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
`

const MethodologyRowValue = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
  min-width: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  overflow-wrap: anywhere;
`

const MethodologyMono = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkBlue};
  overflow-wrap: anywhere;
`

const MethodologyLink = styled.a`
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`

/* ─── Recipients search + pagination ─── */

const TableToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const SearchLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const SearchInput = styled.input`
  flex: 1 1 220px;
  min-width: 0;
  height: 32px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-family: inherit;
  transition: border-color ${tokens.motion.inFast};

  &::placeholder {
    color: ${tokens.color.darkGray};
  }

  &:hover {
    border-color: ${tokens.color.middleGray};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-color: ${tokens.color.blue};
  }
`

const MatchCaption = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  white-space: nowrap;
`

const TableScrollWrap = styled.div`
  width: 100%;
  max-width: 680px;
  max-height: 560px;
  overflow-y: auto;
`

const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding-top: ${tokens.spacing.sm};
`

const PageButton = styled.button`
  appearance: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  font-family: inherit;
  transition: border-color ${tokens.motion.inFast}, color ${tokens.motion.inFast};

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PageStatus = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
`

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function isLegacyEndpointError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404
}

function statusLabel(status: RoundStatus | RewardStatus): string {
  if (status === 'live') return 'Live'
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  if (status === 'not_eligible') return 'Not eligible'
  if (status === 'no_reward') return 'No payout'
  if (status === 'unavailable') return 'Unavailable'
  return 'Ended'
}

function formatEns(value: string | null, empty = 'Unavailable', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

function formatAddressReward(reward: AddressRoundReward | null): string {
  if (!reward) return 'No address'
  if (reward.rewardStatus === 'pending') return 'Pending'
  if (reward.rewardStatus === 'unavailable') return 'Unavailable'
  return formatEns(reward.totalRewardEns, '0 ENS')
}

function formatCount(value: number | null | undefined, empty = 'Unavailable'): string {
  return value == null ? empty : value.toLocaleString('en-US')
}

function formatProbability(value: string | null): string {
  if (value == null) return 'Unavailable'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Unavailable'
  return `${(numericValue * 100).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}%`
}

function truncateSeedHex(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length <= 14) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function lotterySharePercent(round: RoundDetailResponse): number | null {
  const lotteryEns = Number(round.lotteryPrizeEns ?? '0')
  const totalEns = Number(round.totalDistributedEns ?? '0')
  if (!Number.isFinite(lotteryEns) || !Number.isFinite(totalEns) || totalEns <= 0) return null
  return (lotteryEns / totalEns) * 100
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

interface AddressLotteryEntry {
  bucket: LotteryBucketDetail
  entry: LotteryEntryDetail
  won: boolean
}

interface AddressLotteryInsight {
  tone: ResultTone
  title: string
  body: string
  metrics: Array<{ label: string; value: string }>
}

const LOTTERY_ENTRY_DISPLAY_LIMIT = 100
const RECIPIENTS_PAGE_SIZE = 50
const RECIPIENTS_PAGINATION_THRESHOLD = 100

function getAddressLotteryEntries(lottery: LotteryDetail | null, address: string): AddressLotteryEntry[] {
  if (!lottery || !address) return []

  const entries: AddressLotteryEntry[] = []
  for (const bucket of lottery.buckets) {
    for (const entry of bucket.entries) {
      if (sameAddress(entry.address, address)) {
        entries.push({
          bucket,
          entry,
          won: sameAddress(bucket.winner, address),
        })
      }
    }
  }

  return entries
}

function sumEntryAmountEns(entries: AddressLotteryEntry[]): string {
  const total = entries.reduce((acc, item) => acc + Number(item.entry.amountEns), 0)
  if (!Number.isFinite(total)) return 'Unavailable'
  return `${total.toLocaleString('en-US', { maximumFractionDigits: 4 })} ENS`
}

function bestEntryProbability(entries: AddressLotteryEntry[]): string {
  const best = entries.reduce((max, item) => {
    const probability = Number(item.entry.probability)
    return Number.isFinite(probability) ? Math.max(max, probability) : max
  }, 0)
  return best > 0 ? formatProbability(String(best)) : 'Unavailable'
}

function bucketList(entries: AddressLotteryEntry[]): string {
  const buckets = [...new Set(entries.map((item) => item.bucket.bucketIndex + 1))]
  return buckets.map((bucket) => `#${bucket}`).join(', ')
}

function hasDirectReward(round: RoundDetailResponse): boolean {
  const reward = round.addressReward
  if (!reward) return false
  return Number(reward.voterRewardEns) > 0 || Number(reward.tokenHolderRewardEns) > 0
}

function buildAddressLotteryInsight(
  round: RoundDetailResponse,
  activeAddress: string,
  activeAddressValid: boolean,
): AddressLotteryInsight {
  if (!activeAddress) {
    return {
      tone: 'neutral',
      title: 'Check a wallet',
      body: 'Paste an ENS name or 0x address above to see what it earned this round.',
      metrics: [],
    }
  }

  if (!activeAddressValid) {
    return {
      tone: 'danger',
      title: 'That doesn’t look like a valid address',
      body: 'Paste an ENS name or 0x address to check.',
      metrics: [],
    }
  }

  if (round.distributionDataStatus !== 'available') {
    return {
      tone: 'pending',
      title: 'This round hasn’t drawn yet',
      body: `Round ${round.roundNumber} is still ${round.status}. Results show up the moment it closes.`,
      metrics: [],
    }
  }

  if (!round.lottery) {
    return {
      tone: 'neutral',
      title: 'No pools this round',
      body: 'Every reward this round was over 1 ENS, so they all went out directly to wallets.',
      metrics: [],
    }
  }

  const entries = getAddressLotteryEntries(round.lottery, activeAddress)
  const winningEntries = entries.filter((item) => item.won)

  if (winningEntries.length > 0) {
    const lotteryReward = round.addressReward?.lotteryRewardEns ?? null
    return {
      tone: 'success',
      title:
        winningEntries.length === 1
          ? `You won pool #${winningEntries[0].bucket.bucketIndex + 1} · ${formatEns(lotteryReward, '10 ENS')}`
          : `You won ${winningEntries.length} pools this round`,
      body: 'Your prize landed in the same transfer as the rest of your round rewards.',
      metrics: [
        { label: 'Prize', value: formatEns(lotteryReward, '0 ENS') },
        { label: 'Pools won', value: bucketList(winningEntries) },
        { label: 'Your odds', value: bestEntryProbability(winningEntries) },
      ],
    }
  }

  if (entries.length > 0) {
    return {
      tone: 'warning',
      title: `You were in pool #${entries[0].bucket.bucketIndex + 1}, but didn’t win`,
      body: 'Your reward was under 1 ENS, so it joined a pool. Another wallet won the draw.',
      metrics: [
        { label: 'Your share', value: sumEntryAmountEns(entries) },
        { label: 'Pools entered', value: bucketList(entries) },
        { label: 'Your odds', value: bestEntryProbability(entries) },
      ],
    }
  }

  if (hasDirectReward(round)) {
    return {
      tone: 'success',
      title: 'Your reward went out directly',
      body: `You earned ${formatEns(round.addressReward?.totalRewardEns ?? null)} this round. That’s over 1 ENS, so it skipped the pool and paid out directly.`,
      metrics: [
        { label: 'Reward', value: formatEns(round.addressReward?.totalRewardEns ?? null, '0 ENS') },
      ],
    }
  }

  return {
    tone: 'neutral',
    title: 'No reward this round',
    body: 'This wallet didn’t earn anything in this round.',
    metrics: [],
  }
}

function buildRoundPath(roundNumber: number, activeAddress: string, activeAddressValid: boolean): string {
  const addressQuery = activeAddress && activeAddressValid
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  return `/rounds/${roundNumber}${addressQuery}`
}

/* ─── Recipients table (with search + auto-highlight + pagination) ─── */

interface RecipientsTableProps {
  rows: RewardRank[]
  highlightAddress: string
  searchLabel: string
  searchPlaceholder?: string
}

function rowMatchesQuery(row: RewardRank, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  const ens = (row.ensName ?? '').toLowerCase()
  const addr = row.address.toLowerCase()
  return ens.includes(needle) || addr.includes(needle)
}

function RecipientsTable({
  rows,
  highlightAddress,
  searchLabel,
  searchPlaceholder = 'Search address or ENS',
}: RecipientsTableProps) {
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())
  const scrollWrapRef = useRef<HTMLDivElement | null>(null)
  const hasScrolledRef = useRef(false)

  // Debounce search input (200ms) using setTimeout, no library.
  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery.trim()), 200)
    return () => clearTimeout(id)
  }, [rawQuery])

  // Reset page when query changes.
  useEffect(() => {
    setPage(1)
  }, [query])

  const filteredRows = useMemo(() => {
    if (!query) return rows
    return rows.filter((row) => rowMatchesQuery(row, query))
  }, [rows, query])

  const showPagination = rows.length > RECIPIENTS_PAGINATION_THRESHOLD
  const totalPages = showPagination
    ? Math.max(1, Math.ceil(filteredRows.length / RECIPIENTS_PAGE_SIZE))
    : 1
  const currentPage = Math.min(page, totalPages)
  const visibleRows = showPagination
    ? filteredRows.slice((currentPage - 1) * RECIPIENTS_PAGE_SIZE, currentPage * RECIPIENTS_PAGE_SIZE)
    : filteredRows

  const highlightLower = highlightAddress ? highlightAddress.toLowerCase() : ''

  // Auto-scroll to the highlighted row on first paint where it is visible.
  useEffect(() => {
    if (!highlightLower) return
    if (hasScrolledRef.current) return
    if (typeof window === 'undefined') return
    const node = rowRefs.current.get(highlightLower)
    if (!node) return
    hasScrolledRef.current = true
    // Defer to next frame so layout is settled.
    const id = window.requestAnimationFrame(() => {
      if (typeof node.scrollIntoView === 'function') {
        try {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch {
          node.scrollIntoView()
        }
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [highlightLower, visibleRows])

  if (rows.length === 0) {
    return <EmptyState>No distribution data.</EmptyState>
  }

  const matchCaption = query ? `${filteredRows.length.toLocaleString('en-US')} matching` : null

  return (
    <div>
      <TableToolbar>
        <SearchLabel htmlFor={`recipients-search-${searchLabel}`}>
          Search recipients by address or ENS
        </SearchLabel>
        <SearchInput
          id={`recipients-search-${searchLabel}`}
          type="search"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
        {matchCaption ? <MatchCaption>{matchCaption}</MatchCaption> : null}
      </TableToolbar>

      <TableScrollWrap ref={scrollWrapRef}>
        <TableWrap>
          <Table>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '56%' }} />
              <col style={{ width: '28%' }} />
            </colgroup>
            <Thead>
              <tr>
                <Th>Rank</Th>
                <Th>Address</Th>
                <Th>Reward</Th>
              </tr>
            </Thead>
            <Tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <Td colSpan={3}>
                    <EmptyState>No recipients match this search.</EmptyState>
                  </Td>
                </tr>
              ) : (
                visibleRows.map((rank) => {
                  const isHighlighted = highlightLower !== '' && rank.address.toLowerCase() === highlightLower
                  return (
                    <Row
                      key={`${rank.role}-${rank.rank}-${rank.address}`}
                      $highlighted={isHighlighted}
                      aria-current={isHighlighted ? 'true' : undefined}
                      ref={(node) => {
                        if (node) {
                          rowRefs.current.set(rank.address.toLowerCase(), node)
                        }
                      }}
                    >
                      <Td data-label="Rank">#{rank.rank}</Td>
                      <Td data-label="Address">
                        <AddressText>{rank.ensName ?? truncateAddress(rank.address)}</AddressText>
                      </Td>
                      <Td data-label="Reward">
                        <RewardValue>{formatEns(rank.rewardEns)}</RewardValue>
                      </Td>
                    </Row>
                  )
                })
              )}
            </Tbody>
          </Table>
        </TableWrap>
      </TableScrollWrap>

      {showPagination ? (
        <Pagination aria-label="Recipients pagination">
          <PageButton
            type="button"
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            ← Prev
          </PageButton>
          <PageStatus>
            Page {currentPage} of {totalPages}
          </PageStatus>
          <PageButton
            type="button"
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next →
          </PageButton>
        </Pagination>
      ) : null}
    </div>
  )
}

function rewardCountLabel(count: number): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'recipient' : 'recipients'}`
}

function lotteryBucketCountLabel(lottery: LotteryDetail | null): string {
  if (!lottery) return 'Unavailable'
  return `${lottery.bucketCount.toLocaleString('en-US')} ${lottery.bucketCount === 1 ? 'pool' : 'pools'}`
}

function visibleLotteryEntryCountLabel(totalCount: number, visibleCount: number): string {
  if (totalCount === 0) return 'No entries'
  if (visibleCount >= totalCount) {
    return `${totalCount.toLocaleString('en-US')} ${totalCount === 1 ? 'entry' : 'entries'}`
  }
  return `Showing first ${visibleCount.toLocaleString('en-US')} of ${totalCount.toLocaleString('en-US')} entries`
}

function flattenLotteryEntries(lottery: LotteryDetail | null): LotteryEntryDetail[] {
  if (!lottery) return []
  return lottery.buckets.flatMap((bucket) => bucket.entries)
}

function LotteryBucketTable({ buckets }: { buckets: LotteryBucketDetail[] }) {
  if (buckets.length === 0) {
    return <EmptyState>No pool draws this round.</EmptyState>
  }

  return (
    <WideTableWrap>
      <Table>
        <colgroup>
          <col style={{ width: '14%' }} />
          <col style={{ width: '42%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <Thead>
          <tr>
            <Th>Pool</Th>
            <Th>Winner</Th>
            <Th>Prize</Th>
            <Th>Entries</Th>
            <Th>Odds</Th>
          </tr>
        </Thead>
        <Tbody>
          {buckets.map((bucket) => (
            <Row key={bucket.bucketIndex}>
              <Td data-label="Pool">#{bucket.bucketIndex + 1}</Td>
              <Td data-label="Winner">
                <CopyableAddress
                  address={bucket.winner}
                  ensName={bucket.winnerEnsName}
                  resolveEns={false}
                  showEnsName
                />
              </Td>
              <Td data-label="Prize">
                <RewardValue>{formatEns(bucket.prizeEns)}</RewardValue>
              </Td>
              <Td data-label="Entries">{bucket.entryCount.toLocaleString('en-US')}</Td>
              <Td data-label="Odds">{formatProbability(bucket.winnerProbability)}</Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </WideTableWrap>
  )
}

function LotteryEntryTable({
  entries,
  totalCount,
}: {
  entries: LotteryEntryDetail[]
  totalCount: number
}) {
  if (entries.length === 0) {
    return <EmptyState>No pool entries this round.</EmptyState>
  }

  return (
    <div>
      <WideTableWrap>
        <Table>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '48%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <Thead>
            <tr>
              <Th>Pool</Th>
              <Th>Participant</Th>
              <Th>Share</Th>
              <Th>Odds</Th>
            </tr>
          </Thead>
          <Tbody>
            {entries.map((entry) => (
              <Row key={`${entry.bucketIndex}-${entry.entryIndex}-${entry.address}`}>
                <Td data-label="Pool">#{entry.bucketIndex + 1}</Td>
                <Td data-label="Participant">
                  <CopyableAddress
                    address={entry.address}
                    ensName={entry.ensName}
                    resolveEns={false}
                    showEnsName
                  />
                </Td>
                <Td data-label="Share">{formatEns(entry.amountEns, '0 ENS')}</Td>
                <Td data-label="Odds">{formatProbability(entry.probability)}</Td>
              </Row>
            ))}
          </Tbody>
        </Table>
      </WideTableWrap>
      {entries.length < totalCount ? (
        <TableNote>
          Showing the first {entries.length.toLocaleString('en-US')} entries. Use the wallet search above to look up a specific address.
        </TableNote>
      ) : null}
    </div>
  )
}

function AddressLotteryInsightPanel({
  round,
  activeAddress,
  activeAddressValid,
}: {
  round: RoundDetailResponse
  activeAddress: string
  activeAddressValid: boolean
}) {
  const insight = buildAddressLotteryInsight(round, activeAddress, activeAddressValid)
  const icon =
    insight.tone === 'success'
      ? faTrophy
      : insight.tone === 'warning'
        ? faHourglassHalf
        : insight.tone === 'pending'
          ? faHourglassHalf
          : insight.tone === 'danger'
            ? faXmark
            : faMagnifyingGlass

  return (
    <AddressLotteryWrapper>
      <ResultStrip $tone={insight.tone}>
        <ResultIcon $tone={insight.tone} aria-hidden>
          <FontAwesomeIcon icon={icon} />
        </ResultIcon>
        <ResultBody>
          <ResultTitle $tone={insight.tone}>{insight.title}</ResultTitle>
          <ResultText>{insight.body}</ResultText>
          {insight.metrics.length > 0 ? (
            <ResultMetrics>
              {insight.metrics.map((m) => (
                <ResultMetric key={m.label}>
                  <ResultMetricLabel>{m.label}</ResultMetricLabel>
                  <ResultMetricValue>{m.value}</ResultMetricValue>
                </ResultMetric>
              ))}
            </ResultMetrics>
          ) : null}
          {activeAddress && activeAddressValid ? (
            <AddressLotteryAddressRow>
              <span>Checking:</span>
              <CopyableAddress address={activeAddress} resolveEns={false} showEnsName />
            </AddressLotteryAddressRow>
          ) : null}
        </ResultBody>
      </ResultStrip>
    </AddressLotteryWrapper>
  )
}

/* ─── Methodology card ─── */

const GITHUB_ALGORITHM_URL = 'https://github.com/blockful-io/delegation-incentives-system'

function MethodologySection({ round }: { round: RoundDetailResponse }) {
  const lottery = round.lottery
  const seedValue = lottery?.seed.value ?? null
  const seedHasValue = typeof seedValue === 'string' && seedValue.length > 0
  const blockNumberRaw = lottery?.seed.blockNumber ?? null
  const blockNumberNumeric = blockNumberRaw != null ? Number(blockNumberRaw) : NaN
  const blockNumberDisplay = Number.isFinite(blockNumberNumeric)
    ? `#${blockNumberNumeric.toLocaleString('en-US')}`
    : '—'
  const blockEtherscanUrl = Number.isFinite(blockNumberNumeric)
    ? `https://etherscan.io/block/${blockNumberNumeric}`
    : null
  // Seed link uses the block explorer for the seed block (we don't have a tx hash for prevRandao).
  const seedEtherscanUrl = blockEtherscanUrl

  return (
    <Section>
      <SectionHeader>
        <SectionLabelGroup>
          <SectionLabel>Transparency</SectionLabel>
          <SectionTitle>Verify this round onchain</SectionTitle>
        </SectionLabelGroup>
      </SectionHeader>
      <MethodologyCard>
        {lottery && seedHasValue ? (
          <MethodologyRow>
            <MethodologyRowLabel>Random seed (RANDAO)</MethodologyRowLabel>
            <MethodologyRowValue>
              <CopyChip
                value={seedValue!}
                display={truncateSeedHex(seedValue)}
                label="Seed"
              />
            </MethodologyRowValue>
            {seedEtherscanUrl ? (
              <MethodologyLink href={seedEtherscanUrl} target="_blank" rel="noopener noreferrer">
                View on Etherscan ↗
              </MethodologyLink>
            ) : (
              <span aria-hidden>—</span>
            )}
          </MethodologyRow>
        ) : null}

        <MethodologyRow>
          <MethodologyRowLabel>Source code</MethodologyRowLabel>
          <MethodologyRowValue>
            <MethodologyMono>
              github.com/blockful-io/delegation-incentives-system
            </MethodologyMono>
          </MethodologyRowValue>
          <MethodologyLink href={GITHUB_ALGORITHM_URL} target="_blank" rel="noopener noreferrer">
            View on GitHub ↗
          </MethodologyLink>
        </MethodologyRow>

        {blockNumberRaw != null ? (
          <MethodologyRow>
            <MethodologyRowLabel>Snapshot block</MethodologyRowLabel>
            <MethodologyRowValue>
              <MethodologyMono>{blockNumberDisplay}</MethodologyMono>
            </MethodologyRowValue>
            {blockEtherscanUrl ? (
              <MethodologyLink href={blockEtherscanUrl} target="_blank" rel="noopener noreferrer">
                View on Etherscan ↗
              </MethodologyLink>
            ) : (
              <span aria-hidden>—</span>
            )}
          </MethodologyRow>
        ) : null}
      </MethodologyCard>
    </Section>
  )
}

export function RoundDetailPage() {
  const params = useParams()
  const roundNumber = Number(params.roundNumber)
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress || walletAddress
  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const [addressInput, setAddressInput] = useState(activeAddress)
  const [inputError, setInputError] = useState<string | null>(null)

  const fetchRound = useCallback(
    async () => {
      try {
        return await api.round(roundNumber, activeAddressValid ? activeAddress : undefined, {
          rewardLimit: '25',
        })
      } catch (error) {
        if (!isLegacyEndpointError(error)) throw error

        let rounds = []
        try {
          rounds = (await api.rounds()).rounds
        } catch (roundsError) {
          if (!isLegacyEndpointError(roundsError)) throw roundsError

          const currentRound = await api.currentRound()
          rounds = buildRoundListFromCurrentRound(currentRound).rounds
        }

        const summary = rounds.find((candidate) => candidate.roundNumber === roundNumber)
        if (!summary) throw new Error(`Unknown round ${roundNumber}`)
        return buildRoundDetailFallback(summary, activeAddressValid ? activeAddress : undefined)
      }
    },
    [roundNumber, activeAddress, activeAddressValid],
  )
  const round = useAsync(fetchRound, Number.isInteger(roundNumber) && roundNumber > 0)
  const fetchRoundList = useCallback(async () => {
    try {
      return await api.rounds()
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error

      const currentRound = await api.currentRound()
      return buildRoundListFromCurrentRound(currentRound)
    }
  }, [])
  const roundList = useAsync(fetchRoundList, Number.isInteger(roundNumber) && roundNumber > 0)

  useEffect(() => {
    setAddressInput(activeAddress)
    setInputError(null)
  }, [activeAddress])

  const sourceLabel = searchedAddress
    ? 'Searched address'
    : walletAddress
      ? 'Connected wallet'
      : 'No address selected'
  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)
  const backTo = activeAddressValid
    ? `/rounds?address=${encodeURIComponent(activeAddress)}`
    : '/rounds'
  const availableRoundNumbers = useMemo(
    () => (roundList.data?.rounds ?? [])
      .map((candidate) => candidate.roundNumber)
      .sort((a, b) => a - b),
    [roundList.data],
  )
  const previousRoundNumber = availableRoundNumbers
    .filter((candidate) => candidate < roundNumber)
    .at(-1) ?? null
  const nextRoundNumber = availableRoundNumbers
    .find((candidate) => candidate > roundNumber) ?? null
  const lotteryEntries = useMemo(
    () => flattenLotteryEntries(round.data?.lottery ?? null),
    [round.data?.lottery],
  )
  const visibleLotteryEntries = useMemo(
    () => lotteryEntries.slice(0, LOTTERY_ENTRY_DISPLAY_LIMIT),
    [lotteryEntries],
  )

  function handleAddressSubmit() {
    const nextAddress = addressInput.trim()
    if (!nextAddress) {
      handleAddressClear()
      return
    }

    if (!isAddress(nextAddress)) {
      setInputError('Invalid address')
      return
    }

    setSearchParams((next) => {
      next.set('address', nextAddress)
      return next
    })
  }

  function handleAddressClear() {
    setSearchParams((next) => {
      next.delete('address')
      return next
    })
    setAddressInput(walletAddress)
    setInputError(null)
  }

  if (round.loading) {
    return <RoundDetailPageSkeleton />
  }

  if (!Number.isInteger(roundNumber) || roundNumber <= 0) {
    return (
      <Page>
        <TopNav>
          <BackLink to={backTo}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to rounds
          </BackLink>
        </TopNav>
        <ErrorMessage>Unknown round.</ErrorMessage>
      </Page>
    )
  }

  if (round.error || !round.data) {
    return (
      <Page>
        <ErrorMessage>Failed to load round data: {round.error}</ErrorMessage>
      </Page>
    )
  }

  const roundData = round.data
  const hasActiveAddress = Boolean(activeAddress && activeAddressValid)
  const lotteryShare = lotterySharePercent(roundData)
  const recipientsCount =
    roundData.topVoterRewards.length + roundData.topTokenHolderRewards.length
  const lotteryShareValue =
    roundData.lotteryPrizeEns != null
      ? `${formatEnsAmount(roundData.lotteryPrizeEns, { maximumFractionDigits: 2 })} ENS`
      : 'Unavailable'
  const lotteryShareSub =
    lotteryShare != null
      ? `${lotteryShare.toLocaleString('en-US', { maximumFractionDigits: 1 })}% of total`
      : roundData.lotteryBucketCount != null
        ? `via ${roundData.lotteryBucketCount.toLocaleString('en-US')} buckets`
        : undefined

  const description =
    roundData.status === 'live'
      ? 'Track what gets paid out this round. Look up any wallet to see what it earned.'
      : roundData.status === 'paid'
        ? 'Final results for this round. Look up any wallet to see what it earned.'
        : 'This round hasn’t closed yet. Results show up the moment it does.'

  return (
    <Page>
      {/* Top nav: back + round prev/next */}
      <TopNav>
        <BackLink to={backTo}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLink>
        <RoundNav aria-label="Round navigation">
          {previousRoundNumber == null ? (
            <DisabledRoundNavButton aria-disabled="true">
              <FontAwesomeIcon icon={faArrowLeft} />
              Previous
            </DisabledRoundNavButton>
          ) : (
            <RoundNavButton to={buildRoundPath(previousRoundNumber, activeAddress, activeAddressValid)}>
              <FontAwesomeIcon icon={faArrowLeft} />
              Previous
            </RoundNavButton>
          )}
          {nextRoundNumber == null ? (
            <DisabledRoundNavButton aria-disabled="true">
              Next
              <FontAwesomeIcon icon={faArrowRight} />
            </DisabledRoundNavButton>
          ) : (
            <RoundNavButton to={buildRoundPath(nextRoundNumber, activeAddress, activeAddressValid)}>
              Next
              <FontAwesomeIcon icon={faArrowRight} />
            </RoundNavButton>
          )}
        </RoundNav>
      </TopNav>

      {/* Hero: eyebrow with status dot + title + description */}
      <HeaderBlock>
        <EyebrowPill>
          <span>Round {roundData.roundNumber}</span>
          <EyebrowSep aria-hidden>·</EyebrowSep>
          <span>{formatUtcMonthRange(roundData.startDate, roundData.endDate)}</span>
          <StatusDot $status={roundData.status} aria-hidden />
        </EyebrowPill>
        <PageTitle>Round results</PageTitle>
        <Description>{description}</Description>
        <StatusPill $status={roundData.status}>{statusLabel(roundData.status)}</StatusPill>
      </HeaderBlock>

      {/* Stats row */}
      <StatsRow>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatEns(roundData.poolSizeEns, 'Unavailable', 0)}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faCoins} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Pool</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatCount(recipientsCount, '0')}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faUsers} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Wallets paid</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>
              {formatEns(
                roundData.totalDistributedEns,
                roundData.status === 'live' ? 'Pending' : 'Unavailable',
              )}
            </StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faCheck} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Total paid out</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue $tone="positive">{lotteryShareValue}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faTrophy} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Pool prizes</StatLabel>
          {lotteryShareSub ? <StatSub>{lotteryShareSub}</StatSub> : null}
        </StatCard>
      </StatsRow>

      {/* Address inspector */}
      <Section>
        <SectionHeader>
          <SectionLabelGroup>
            <SectionLabel>Check a wallet</SectionLabel>
            <SectionTitle>See what this round paid an address</SectionTitle>
          </SectionLabelGroup>
          {hasActiveAddress ? (
            <RowCount>{formatAddressReward(roundData.addressReward)}</RowCount>
          ) : null}
        </SectionHeader>
        <AddressLookupForm
          value={addressInput}
          activeAddress={activeAddress}
          sourceLabel={sourceLabel}
          error={addressError}
          onChange={setAddressInput}
          onSubmit={handleAddressSubmit}
          onClear={handleAddressClear}
        />
        <AddressLotteryInsightPanel
          round={roundData}
          activeAddress={activeAddress}
          activeAddressValid={activeAddressValid}
        />
      </Section>

      {/* Delegate rewards */}
      <Section>
        <SectionHeader>
          <SectionLabelGroup>
            <SectionLabel>Delegate rewards</SectionLabel>
            <SectionTitle>Top delegates this round</SectionTitle>
          </SectionLabelGroup>
          <RowCount>{rewardCountLabel(roundData.topVoterRewards.length)}</RowCount>
        </SectionHeader>
        <RecipientsTable
          rows={roundData.topVoterRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          searchLabel="delegates"
        />
      </Section>

      {/* Token holder rewards */}
      <Section>
        <SectionHeader>
          <SectionLabelGroup>
            <SectionLabel>Token holder rewards</SectionLabel>
            <SectionTitle>Top token holders this round</SectionTitle>
          </SectionLabelGroup>
          <RowCount>{rewardCountLabel(roundData.topTokenHolderRewards.length)}</RowCount>
        </SectionHeader>
        <RecipientsTable
          rows={roundData.topTokenHolderRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          searchLabel="token-holders"
        />
      </Section>

      {/* Pool prizes — formerly Lottery */}
      {roundData.lottery ? (
        <Section>
          <SectionHeader>
            <SectionLabelGroup>
              <SectionLabel>Pool prizes</SectionLabel>
              <SectionTitle>How small rewards combined into 10 ENS prizes</SectionTitle>
            </SectionLabelGroup>
            <RowCount>{lotteryBucketCountLabel(roundData.lottery)}</RowCount>
          </SectionHeader>

          <StatsRow>
            <StatCard>
              <StatTopRow>
                <StatValue>{formatEns(roundData.lottery.bucketTargetEns, '0 ENS')}</StatValue>
                <StatIconBox aria-hidden>
                  <FontAwesomeIcon icon={faTrophy} />
                </StatIconBox>
              </StatTopRow>
              <StatLabel>Prize per pool</StatLabel>
            </StatCard>
            <StatCard>
              <StatTopRow>
                <StatValue>{roundData.lottery.bucketCount.toLocaleString('en-US')}</StatValue>
                <StatIconBox aria-hidden>
                  <FontAwesomeIcon icon={faLayerGroup} />
                </StatIconBox>
              </StatTopRow>
              <StatLabel>
                {roundData.lottery.bucketCount === 1 ? 'Pool this round' : 'Pools this round'}
              </StatLabel>
            </StatCard>
            <StatCard>
              <StatTopRow>
                <StatValue>{roundData.lottery.participantCount.toLocaleString('en-US')}</StatValue>
                <StatIconBox aria-hidden>
                  <FontAwesomeIcon icon={faUsers} />
                </StatIconBox>
              </StatTopRow>
              <StatLabel>Participants</StatLabel>
            </StatCard>
            <StatCard>
              <StatTopRow>
                <StatValue>{formatCount(roundData.lotteryEntryCount)}</StatValue>
                <StatIconBox aria-hidden>
                  <FontAwesomeIcon icon={faCheck} />
                </StatIconBox>
              </StatTopRow>
              <StatLabel>Entries</StatLabel>
            </StatCard>
          </StatsRow>

          <LotteryBucketTable buckets={roundData.lottery.buckets} />

          <SectionHeader style={{ marginTop: 8 }}>
            <SectionLabelGroup>
              <SectionLabel>All pool entries</SectionLabel>
              <SectionTitle>Every wallet that joined a pool</SectionTitle>
            </SectionLabelGroup>
            <RowCount>
              {visibleLotteryEntryCountLabel(lotteryEntries.length, visibleLotteryEntries.length)}
            </RowCount>
          </SectionHeader>
          <LotteryEntryTable entries={visibleLotteryEntries} totalCount={lotteryEntries.length} />
        </Section>
      ) : (
        <Section>
          <SectionHeader>
            <SectionLabelGroup>
              <SectionLabel>Pool prizes</SectionLabel>
              <SectionTitle>
                {roundData.status === 'paid'
                  ? 'No pools this round'
                  : 'Pools draw when this round closes'}
              </SectionTitle>
            </SectionLabelGroup>
          </SectionHeader>
          <EmptyState>
            {roundData.status === 'paid'
              ? 'Every reward this round was over 1 ENS, so they all went out directly to wallets.'
              : `Round ${roundData.roundNumber} is still ${roundData.status}. Pool draws happen the moment it closes.`}
          </EmptyState>
        </Section>
      )}

      {/* Transparency */}
      <MethodologySection round={roundData} />
    </Page>
  )
}
