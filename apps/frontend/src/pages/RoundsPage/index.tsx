import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import { isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faCoins,
  faRankingStar,
  faPercent,
  faChevronRight,
  faWallet,
  faXmark,
  faShareNodes,
  faLock,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { api, ApiClientError } from '@/api'
import type { AddressDistributionRound, RoundStatus, RoundSummary } from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { useRounds } from '@/features/rounds/useRounds'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, ErrorMessage } from '@/styles'
import { SkeletonBlock } from '@/components/shared/Skeleton'
import { RoundsPageSkeleton } from '@/components/shared/PageSkeletons'
import {
  formatEnsAmount,
  formatUtcDate,
  formatUtcMonthRange,
  truncateAddress,
} from '@/utils/format'
import {
  buildRoundListFromCurrentRound,
  buildUnavailableAddressHistory,
} from './roundFallback'

/* ─── Page shell ─── */

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
`

/* ─── Hero ─── */

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
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid ${tokens.color.white};
  border-radius: 14px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing['2xl']};
  flex-wrap: wrap;
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

const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0.55); }
  70%  { box-shadow: 0 0 0 18px rgba(25, 156, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 156, 117, 0); }
`

const LiveDot = styled.span<{ $status: RoundStatus }>`
  display: inline-block;
  width: 20px;
  height: 20px;
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
    box-shadow: ${({ $status }) =>
      $status === 'live' ? `0 0 0 6px ${tokens.color.status.success.bg}` : 'none'};
  }
`

const Description = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
  color: ${tokens.color.darkGray};
  text-align: center;
  max-width: 646px;
  text-wrap: pretty;
`

/* ─── Stats + progress ─── */

const SummaryBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
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
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'positive' ? tokens.color.positiveEmphasis : tokens.color.darkBlue};
  line-height: 1.1;
  white-space: nowrap;
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

const ProgressBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`

const ProgressTrack = styled.div`
  position: relative;
  width: 100%;
  height: 12px;
  background: ${tokens.color.borderLight};
  border-radius: 9999px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${tokens.color.blue};
  border-radius: 9999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
`

const BarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const BarLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
`

const BarEndGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const TimeLeft = styled.span<{ $status: RoundStatus }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $status }) =>
    $status === 'live' ? tokens.color.blue : tokens.color.darkGray};
  line-height: 20px;
`

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background: ${tokens.color.textSubtle};
`

/* ─── Tier ladder card ─── */

const TierCard = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const TierCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const TierCardLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const TierCardEyebrow = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 1.3;
`

const TierCardHeading = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.3;
`

const TierAprBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  background: ${tokens.color.status.success.bg};
  color: ${tokens.color.positiveEmphasis};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  white-space: nowrap;
`

const TierLadder = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
`

type TierPipState = 'unlocked' | 'current' | 'locked'

const TierPip = styled.div<{ $state: TierPipState }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  background: ${({ $state }) =>
    $state === 'current'
      ? tokens.color.status.success.bg
      : $state === 'unlocked'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  border: 1px solid
    ${({ $state }) =>
      $state === 'current'
        ? tokens.color.status.success.border
        : $state === 'unlocked'
          ? tokens.color.lightBlue
          : tokens.color.borderLight};
  min-width: 0;
`

const TierPipIcon = styled.span<{ $state: TierPipState }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: ${({ $state }) =>
    $state === 'current'
      ? tokens.color.positiveEmphasis
      : $state === 'unlocked'
        ? tokens.color.blue
        : 'transparent'};
  color: ${({ $state }) =>
    $state === 'locked' ? tokens.color.textSubtle : tokens.color.white};
  font-size: 9px;
`

const TierPipLabel = styled.span<{ $state: TierPipState }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $state }) =>
    $state === 'current'
      ? tokens.color.positiveEmphasis
      : $state === 'locked'
        ? tokens.color.textSubtle
        : tokens.color.darkBlue};
  white-space: nowrap;
`

const TierProgressBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TierProgressLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
`

const TierProgressLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 1.4;
`

const TierProgressValue = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
`

const TierProgressTrack = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  background: ${tokens.color.borderLight};
  border-radius: 9999px;
  overflow: hidden;
`

const TierProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  background: ${tokens.color.positiveEmphasis};
  border-radius: 9999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
`

const TierShareRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: 16px;

  @media (min-width: 720px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`

const TierShareCopy = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
`

const TierShareButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: 1px solid ${tokens.color.blue};
  font-family: inherit;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: ${tokens.color.darkBlue};
    border-color: ${tokens.color.darkBlue};
    color: ${tokens.color.white};
    text-decoration: none;
  }
`

/* ─── Inspect card ─── */

const InspectCard = styled.section`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const InspectHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InspectLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 767px) {
    flex-wrap: wrap;
  }
`

const SearchInputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`

const SearchIcon = styled.span`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${tokens.color.textSecondary};
  font-size: ${tokens.font.size.base};
  pointer-events: none;
`

const SearchInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid ${({ $hasError }) =>
    $hasError ? tokens.color.negative : tokens.color.borderLight};
  border-radius: 9999px;
  background: ${tokens.color.surface};
  font-size: ${tokens.font.size.base};
  font-family: ${tokens.font.family};
  color: ${tokens.color.darkBlue};
  transition: border-color ${tokens.transition.fast};

  &::placeholder {
    color: ${tokens.color.textSecondary};
  }

  &:hover {
    border-color: ${tokens.color.middleGray};
  }

  &:focus {
    outline: none;
    border-color: ${tokens.color.blue};
    box-shadow: 0 0 0 3px ${tokens.color.lightBlueOpacity};
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

const SearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: none;
  border-radius: 8px;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.accent};
  }

  &:disabled {
    background: ${tokens.color.borderLight};
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
  }
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  border: none;
  border-radius: 8px;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.lightBlue};
  }
`

const HintRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const HintText = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const UseMyWalletPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.lightBlueOpacity};
  border: 1px solid ${tokens.color.blue};
  border-radius: 9999px;
  color: ${tokens.color.blue};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.lightBlue};
  }
`

const ActiveAddressPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${tokens.color.status.success.bg};
  border-radius: 9999px;
  color: ${tokens.color.status.success.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
`

const InputError = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.negative};
  line-height: 16px;
`

/* ─── History table ─── */

const TableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};
`

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $weight?: number }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const rowFadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`

const TableRow = styled.button<{ $clickable?: boolean; $index?: number }>`
  display: flex;
  width: 100%;
  background: ${tokens.color.surface};
  border: none;
  font-family: inherit;
  text-align: left;
  color: inherit;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background ${tokens.transition.fast};
  animation: ${rowFadeIn} 0.28s ease-out both;
  animation-delay: ${({ $index }) => Math.min(($index ?? 0) * 0.03, 0.18)}s;

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  ${({ $clickable }) =>
    $clickable &&
    `
      &:hover { background: ${tokens.color.bgSubtle}; }
      &:focus-visible {
        outline: 2px solid ${tokens.color.blue};
        outline-offset: -2px;
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 4px 0;
  }
`

const TableCell = styled.div<{ $weight?: number; $primary?: boolean }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 10px 16px;
    white-space: normal;
    ${({ $primary }) =>
      $primary
        ? `font-weight: ${tokens.font.weight.bold}; color: ${tokens.color.darkBlue};`
        : ''}
  }
`

const MobileLabel = styled.span`
  display: none;

  @media (max-width: 767px) {
    display: inline-block;
    color: ${tokens.color.darkGray};
    font-weight: ${tokens.font.weight.medium};
  }
`

const MutedCell = styled.span`
  color: ${tokens.color.textSecondary};
  font-weight: ${tokens.font.weight.medium};
`

const RewardPositive = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
`

const VpGrowthPositive = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
`

const RoundNumber = styled.span`
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const StatusPill = styled.span<{ $status: RoundStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 16px;
  text-transform: capitalize;
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

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: currentColor;
    flex-shrink: 0;
  }
`

const ChevronCell = styled(TableCell)`
  justify-content: flex-end;
  color: ${tokens.color.textSecondary};
  transition: color ${tokens.transition.fast}, transform ${tokens.transition.fast};

  ${TableRow}:hover & {
    color: ${tokens.color.blue};
    transform: translateX(2px);
  }

  @media (max-width: 767px) {
    display: none;
  }
`

const TableEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  background: ${tokens.color.surface};
  text-align: center;
`

const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: ${tokens.color.lightBlueOpacity};
  color: ${tokens.color.blue};
  font-size: 20px;
`

const EmptyTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 24px;
`

const EmptyBody = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
  max-width: 440px;
`

/* ─── Helpers ─── */

interface RoundsRow {
  roundNumber: number
  period: string
  pool: string | null
  vpGrowth: string | null
  lottery: string | null
  yourRewards: string | null
  status: RoundStatus
  to: string
  hasAddress: boolean
}

function formatPool(value: string | null): string | null {
  if (value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toFixed(1).replace(/\.0$/, '')}M ENS`
  if (n >= 1_000) return `${(Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}K ENS`
  return `${Math.round(n)} ENS`
}

function formatVpGrowth(value: string | null): string | null {
  if (value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n > 0) return `+${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function formatLottery(round: RoundSummary): string | null {
  if (round.distributionDataStatus === 'in_progress' || round.distributionDataStatus === 'not_started') {
    return null
  }
  if (round.lotteryEntryCount == null || round.lotteryWinnerCount == null) return null
  const buckets = round.lotteryBucketCount?.toLocaleString('en-US') ?? '0'
  return `${buckets} ${round.lotteryBucketCount === 1 ? 'bucket' : 'buckets'}`
}

function formatReward(opts: {
  activeAddress: string
  addressRound: AddressDistributionRound | null
  addressLoading: boolean
  addressError: string | null
  fallbackStatus: RoundSummary['distributionDataStatus']
}): { value: string | null; tone: 'positive' | 'neutral' } {
  const { activeAddress, addressRound, addressLoading, addressError, fallbackStatus } = opts
  if (!activeAddress || !isAddress(activeAddress)) return { value: null, tone: 'neutral' }
  if (addressLoading) return { value: 'Loading…', tone: 'neutral' }
  if (addressError) return { value: null, tone: 'neutral' }
  if (!addressRound) {
    return fallbackStatus === 'in_progress' || fallbackStatus === 'not_started'
      ? { value: 'Pending', tone: 'neutral' }
      : { value: null, tone: 'neutral' }
  }
  if (addressRound.rewardStatus === 'pending') return { value: 'Pending', tone: 'neutral' }
  if (addressRound.rewardStatus === 'unavailable') return { value: null, tone: 'neutral' }
  if (addressRound.rewardStatus === 'not_eligible' || addressRound.rewardStatus === 'no_reward') {
    return { value: '0 ENS', tone: 'neutral' }
  }
  return {
    value: `${formatEnsAmount(addressRound.totalRewardEns, { maximumFractionDigits: 4, signDisplay: 'exceptZero' })} ENS`,
    tone: 'positive',
  }
}

function buildRoundsRows(
  rounds: RoundSummary[],
  activeAddress: string,
  addressRounds: AddressDistributionRound[] | null,
  addressLoading: boolean,
  addressError: string | null,
): RoundsRow[] {
  const addressQuery = activeAddress && isAddress(activeAddress)
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  const rewardsByRound = new Map((addressRounds ?? []).map((r) => [r.roundNumber, r]))
  return rounds.map((r) => {
    const reward = formatReward({
      activeAddress,
      addressRound: rewardsByRound.get(r.roundNumber) ?? null,
      addressLoading,
      addressError,
      fallbackStatus: r.distributionDataStatus,
    })
    return {
      roundNumber: r.roundNumber,
      period: formatUtcMonthRange(r.startDate, r.endDate),
      pool: formatPool(r.poolSizeEns),
      vpGrowth: formatVpGrowth(r.vpGrowthPct),
      lottery: formatLottery(r),
      yourRewards: reward.value,
      status: r.status,
      to: `/rounds/${r.roundNumber}${addressQuery}`,
      hasAddress: Boolean(activeAddress && isAddress(activeAddress)),
    }
  })
}

function progressPercent(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0
  const now = Date.now()
  return Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100))
}

function formatDaysRemaining(daysRemaining: number | null, status: RoundStatus): string {
  if (status === 'paid') return 'Closed'
  if (daysRemaining == null) return 'Pending'
  if (daysRemaining === 0) return 'Last day'
  if (daysRemaining === 1) return '1 day left'
  return `${daysRemaining} days left`
}

function isLegacyEndpointError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404
}

function selectFeaturedRound(rounds: RoundSummary[]): RoundSummary | null {
  return (
    rounds.find((r) => r.isCurrent) ??
    rounds.find((r) => r.status === 'pending') ??
    rounds[0] ??
    null
  )
}

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

/* ─── Component ─── */

export function RoundsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  // Active address is now strictly URL-driven. Wallet prefill happens once on
  // mount via the effect below; subsequent Clears truly empty everything.
  const activeAddress = searchedAddress
  const [addressInput, setAddressInput] = useState(searchedAddress)
  const [inputError, setInputError] = useState<string | null>(null)
  const hasPrefilledRef = useRef(false)
  const userClearedRef = useRef(false)

  const { data: tierData, loading: tiersLoading, error: tiersError } = useRounds()
  const fetchRounds = useCallback(async () => {
    try {
      return await api.rounds()
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error
      const currentRound = await api.currentRound()
      return buildRoundListFromCurrentRound(currentRound)
    }
  }, [])
  const roundList = useAsync(fetchRounds)

  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const fetchAddressHistory = useCallback(async () => {
    try {
      const history = await api.distributionsForAddress(activeAddress)
      if (!('rounds' in history)) {
        return buildUnavailableAddressHistory(activeAddress, roundList.data?.rounds ?? [])
      }
      return history
    } catch (error) {
      if (!isLegacyEndpointError(error)) throw error
      return buildUnavailableAddressHistory(activeAddress, roundList.data?.rounds ?? [])
    }
  }, [activeAddress, roundList.data])
  const addressHistory = useAsync(
    fetchAddressHistory,
    Boolean(activeAddress && activeAddressValid && roundList.data),
  )

  // Prefill once: if the page loads with a connected wallet and no searched
  // address yet, push the wallet address into the URL so it acts as the active
  // address. After that, the URL is the source of truth.
  useEffect(() => {
    if (hasPrefilledRef.current) return
    if (userClearedRef.current) return
    if (!walletAddress || searchedAddress) return
    hasPrefilledRef.current = true
    setAddressInput(walletAddress)
    setSearchParams(
      (p) => {
        p.set('address', walletAddress)
        return p
      },
      { replace: true },
    )
  }, [walletAddress, searchedAddress, setSearchParams])

  // Keep the visible input in sync with the URL (e.g. external navigation).
  useEffect(() => {
    setAddressInput(searchedAddress)
    setInputError(null)
  }, [searchedAddress])

  const currentRound = useMemo(() => {
    const rounds = roundList.data?.rounds ?? []
    return selectFeaturedRound(rounds)
  }, [roundList.data])

  const currentTierIndex = currentRound?.tierIndex ?? tierData?.currentTierIndex ?? 0
  const currentTier = tierData?.tiers?.[currentTierIndex] ?? null

  const rows = useMemo(
    () =>
      buildRoundsRows(
        roundList.data?.rounds ?? [],
        activeAddress,
        addressHistory.data?.rounds ?? null,
        addressHistory.loading,
        addressHistory.error,
      ),
    [roundList.data, activeAddress, addressHistory.data, addressHistory.loading, addressHistory.error],
  )

  function handleSubmit(addressOverride?: string) {
    const next = (addressOverride ?? addressInput).trim()
    if (!next) {
      handleClear()
      return
    }
    if (!isAddress(next)) {
      setInputError('Invalid address')
      return
    }
    userClearedRef.current = false
    setSearchParams((p) => {
      p.set('address', next)
      return p
    })
  }

  function handleClear() {
    userClearedRef.current = true
    setSearchParams((p) => {
      p.delete('address')
      return p
    })
    setAddressInput('')
    setInputError(null)
  }

  function handleUseWallet() {
    if (!walletAddress) return
    userClearedRef.current = false
    setAddressInput(walletAddress)
    handleSubmit(walletAddress)
  }

  if (tiersLoading || roundList.loading) {
    // Render the same skeleton the Suspense fallback used, so the chunk → data
    // load swap is visually seamless (no blank flash, no fadeInUp restart).
    return <RoundsPageSkeleton />
  }

  if (tiersError || roundList.error) {
    return (
      <Page>
        <ErrorMessage>
          Failed to load rounds data: {tiersError ?? roundList.error}
        </ErrorMessage>
      </Page>
    )
  }

  if (!tierData || !roundList.data || !currentRound) {
    return (
      <Page>
        <HeaderBlock>
          <EyebrowPill>Rounds</EyebrowPill>
          <PageTitle>No rounds configured</PageTitle>
          <Description>Round history is unavailable. Check back later.</Description>
        </HeaderBlock>
      </Page>
    )
  }

  const poolLabel = formatPool(currentRound.poolSizeEns ?? null) ?? '—'
  const aprLabel = currentTier?.estimatedAprPct
    ? `~${Number(currentTier.estimatedAprPct).toFixed(2)}%`
    : '—'
  const tierLabel = `#${currentTierIndex + 1}`

  const progressPct = progressPercent(currentRound.startDate, currentRound.endDate)
  const daysLeftLabel = formatDaysRemaining(currentRound.daysRemaining, currentRound.status)

  // ─── Tier ladder + share-to-unlock data ───
  const tierLadder = tierData.tiers ?? []
  const nextTier =
    tierLadder.find((t, idx) => idx > currentTierIndex && !t.isUnlocked) ?? null
  const currentGrowthPct = Number(tierData.currentGrowthPct ?? '0')
  const nextTierGrowthTarget = nextTier ? Number(nextTier.momGrowthMinPct ?? '0') : 0
  const tierProgressPct = nextTier && nextTierGrowthTarget > 0
    ? (currentGrowthPct / nextTierGrowthTarget) * 100
    : 100
  const tierGrowthLabel = `${currentGrowthPct.toFixed(2)}% of ${nextTierGrowthTarget.toFixed(0)}%`
  const nextTierAprLabel = nextTier?.estimatedAprPct
    ? `~${Number(nextTier.estimatedAprPct).toFixed(2)}%`
    : null
  const tierShareText = nextTier
    ? `Tier ${nextTier.index + 1} of the ENS Delegation Incentives Program unlocks at ${nextTierGrowthTarget.toFixed(0)}% VP growth (${nextTierAprLabel ?? 'higher APR'} for everyone). Help us get there:`
    : "We're at the top tier of the ENS Delegation Incentives Program. Keep the active-voter pool growing:"
  const tierShareUrl =
    typeof window !== 'undefined'
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(tierShareText)}&url=${encodeURIComponent(window.location.origin)}`
      : '#'
  const tierShareCta = nextTier ? `Share to unlock Tier ${nextTier.index + 1}` : 'Share the program'

  const showWalletHint =
    Boolean(walletAddress) &&
    !addressInput.trim() &&
    !activeAddress &&
    addressInput !== walletAddress

  const showActivePill =
    Boolean(activeAddress) && activeAddressValid && activeAddress === walletAddress

  const tableEmpty = rows.length === 0
  const noAddressInspected = !activeAddress || !activeAddressValid

  return (
    <Page>
      <HeaderBlock>
        <EyebrowPill>Rounds</EyebrowPill>
        <TitleRow>
          <PageTitle>
            Round {currentRound.roundNumber}{' '}
            {currentRound.status === 'live' ? 'is now live' : currentRound.status === 'paid' ? 'is paid' : currentRound.status}
          </PageTitle>
          <LiveDot $status={currentRound.status} aria-hidden />
        </TitleRow>
        <Description>
          Each round pays out from a shared pool to active voters and the wallets that delegate to them. Track the current round below, and look up any address to see what it earned across history.
        </Description>
      </HeaderBlock>

      <SummaryBlock>
        <StatsRow>
          <StatCard>
            <StatTopRow>
              <StatValue>{poolLabel}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faCoins} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>ENS Pool</StatLabel>
          </StatCard>
          <StatCard>
            <StatTopRow>
              <StatValue>{tierLabel}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faRankingStar} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>Tier</StatLabel>
          </StatCard>
          <StatCard>
            <StatTopRow>
              <StatValue $tone={currentTier ? 'positive' : 'default'}>{aprLabel}</StatValue>
              <StatIconBox aria-hidden>
                <FontAwesomeIcon icon={faPercent} />
              </StatIconBox>
            </StatTopRow>
            <StatLabel>APR</StatLabel>
          </StatCard>
        </StatsRow>

        <ProgressBlock>
          <ProgressTrack>
            <ProgressFill $pct={progressPct} />
          </ProgressTrack>
          <BarLabels>
            <BarLabel>Started {formatUtcDate(currentRound.startDate, { year: 'numeric' })}</BarLabel>
            <BarEndGroup>
              <TimeLeft $status={currentRound.status}>{daysLeftLabel}</TimeLeft>
              <Dot aria-hidden />
              <BarLabel>Ends {formatUtcDate(currentRound.endDate, { year: 'numeric' })}</BarLabel>
            </BarEndGroup>
          </BarLabels>
        </ProgressBlock>
      </SummaryBlock>

      <TierCard>
        <TierCardHeader>
          <TierCardLabel>
            <TierCardEyebrow>Your tier</TierCardEyebrow>
            <TierCardHeading>
              Tier {currentTierIndex + 1} of {tierLadder.length}
            </TierCardHeading>
          </TierCardLabel>
          <TierAprBadge>
            <FontAwesomeIcon icon={faPercent} />
            {aprLabel} APR
          </TierAprBadge>
        </TierCardHeader>

        <TierLadder>
          {tierLadder.map((tier, idx) => {
            const state: TierPipState =
              idx === currentTierIndex
                ? 'current'
                : tier.isUnlocked
                  ? 'unlocked'
                  : 'locked'
            const icon =
              state === 'current' || state === 'unlocked' ? faCheck : faLock
            return (
              <TierPip key={tier.index} $state={state}>
                <TierPipIcon $state={state} aria-hidden>
                  <FontAwesomeIcon icon={icon} />
                </TierPipIcon>
                <TierPipLabel $state={state}>Tier {tier.index + 1}</TierPipLabel>
              </TierPip>
            )
          })}
        </TierLadder>

        {nextTier ? (
          <TierProgressBlock>
            <TierProgressLine>
              <TierProgressLabel>
                Tier {nextTier.index + 1} unlocks at {nextTierGrowthTarget.toFixed(0)}% VP growth
              </TierProgressLabel>
              <TierProgressValue>{tierGrowthLabel}</TierProgressValue>
            </TierProgressLine>
            <TierProgressTrack>
              <TierProgressFill $pct={tierProgressPct} />
            </TierProgressTrack>
          </TierProgressBlock>
        ) : null}

        <TierShareRow>
          <TierShareCopy>
            {nextTier
              ? `Bring in more delegators to unlock ${nextTierAprLabel ?? 'a higher'} APR for everyone.`
              : "You're at the top tier. Help keep the active-voter pool growing."}
          </TierShareCopy>
          <TierShareButton
            href={tierShareUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faShareNodes} />
            {tierShareCta}
          </TierShareButton>
        </TierShareRow>
      </TierCard>

      <InspectCard>
        <InspectHeader>
          <InspectLabel>Inspect address</InspectLabel>
          <SearchRow>
            <SearchInputWrap>
              <SearchIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search by ENS name or 0x address…"
                value={addressInput}
                $hasError={Boolean(inputError)}
                onChange={(e) => {
                  setAddressInput(e.target.value)
                  if (inputError) setInputError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                aria-label="Search by ENS name or address"
              />
            </SearchInputWrap>
            <ActionButtons>
              <SearchButton type="button" onClick={() => handleSubmit()} disabled={!addressInput.trim()}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                Search
              </SearchButton>
              {(addressInput || activeAddress) && (
                <ClearButton type="button" onClick={handleClear}>
                  <FontAwesomeIcon icon={faXmark} />
                  Clear
                </ClearButton>
              )}
            </ActionButtons>
          </SearchRow>

          {(showWalletHint || showActivePill || inputError) && (
            <HintRow>
              {showWalletHint && (
                <>
                  <HintText>or</HintText>
                  <UseMyWalletPill type="button" onClick={handleUseWallet}>
                    <FontAwesomeIcon icon={faWallet} />
                    Use my connected wallet
                  </UseMyWalletPill>
                </>
              )}
              {showActivePill && (
                <ActiveAddressPill>
                  <FontAwesomeIcon icon={faWallet} />
                  Showing rewards for your connected wallet · {truncateAddress(walletAddress)}
                </ActiveAddressPill>
              )}
              {inputError && <InputError>{inputError}</InputError>}
            </HintRow>
          )}
        </InspectHeader>

        <TableCard>
          <TableHeadRow>
            <TableHeadCell $weight={0.9}>Round</TableHeadCell>
            <TableHeadCell>Pool</TableHeadCell>
            <TableHeadCell>VP growth</TableHeadCell>
            <TableHeadCell $weight={1.2}>Lottery</TableHeadCell>
            <TableHeadCell $weight={1.2}>Rewards</TableHeadCell>
            <TableHeadCell $weight={0.7}>Status</TableHeadCell>
            <TableHeadCell $weight={0.25}>{' '}</TableHeadCell>
          </TableHeadRow>

          {tableEmpty ? (
            <TableEmpty>
              <EmptyTitle>No round history yet</EmptyTitle>
              <EmptyBody>
                Once the first round closes, you&apos;ll see pool sizes, voting-power growth, and lottery results here.
              </EmptyBody>
            </TableEmpty>
          ) : (
            rows.map((row, idx) => (
              <TableRow
                key={`${row.roundNumber}:${activeAddress || 'none'}`}
                type="button"
                $clickable
                $index={idx}
                onClick={() => navigate(row.to)}
              >
                <TableCell $weight={0.9} $primary>
                  <MobileLabel>Round</MobileLabel>
                  <RoundNumber>Round {row.roundNumber}</RoundNumber>
                </TableCell>
                <TableCell>
                  <MobileLabel>Pool</MobileLabel>
                  {row.pool ? <span>{row.pool}</span> : <MutedCell>Unavailable</MutedCell>}
                </TableCell>
                <TableCell>
                  <MobileLabel>VP growth</MobileLabel>
                  {row.vpGrowth == null ? (
                    <MutedCell>—</MutedCell>
                  ) : row.vpGrowth.startsWith('+') ? (
                    <VpGrowthPositive>{row.vpGrowth}</VpGrowthPositive>
                  ) : (
                    <span>{row.vpGrowth}</span>
                  )}
                </TableCell>
                <TableCell $weight={1.2}>
                  <MobileLabel>Lottery</MobileLabel>
                  {row.lottery ? <span>{row.lottery}</span> : <MutedCell>Pending</MutedCell>}
                </TableCell>
                <TableCell $weight={1.2}>
                  <MobileLabel>Rewards</MobileLabel>
                  {row.hasAddress && addressHistory.loading ? (
                    <SkeletonBlock $height="14px" $width="84px" $radius="6px" />
                  ) : !row.hasAddress ? (
                    <MutedCell>Inspect an address</MutedCell>
                  ) : row.yourRewards == null ? (
                    <MutedCell>—</MutedCell>
                  ) : row.yourRewards.startsWith('+') ? (
                    <RewardPositive>{row.yourRewards}</RewardPositive>
                  ) : (
                    <span>{row.yourRewards}</span>
                  )}
                </TableCell>
                <TableCell $weight={0.7}>
                  <MobileLabel>Status</MobileLabel>
                  <StatusPill $status={row.status}>{row.status}</StatusPill>
                </TableCell>
                <ChevronCell $weight={0.25} aria-hidden>
                  <FontAwesomeIcon icon={faChevronRight} />
                </ChevronCell>
              </TableRow>
            ))
          )}

          {!tableEmpty && noAddressInspected && (
            <TableEmpty>
              <EmptyIcon aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </EmptyIcon>
              <EmptyTitle>Inspect a wallet to unlock the rewards column</EmptyTitle>
              <EmptyBody>
                Paste an ENS name or 0x address above
                {walletAddress ? ', or use your connected wallet,' : ''}
                {' '}to see what each round paid out to that address.
              </EmptyBody>
            </TableEmpty>
          )}
        </TableCard>
      </InspectCard>
    </Page>
  )
}
