import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faArrowTrendUp,
  faCircleCheck,
  faCircleInfo,
  faUserSlash,
  faCoins,
  faDownload,
  faHourglassHalf,
  faMagnifyingGlass,
  faRankingStar,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { EnsAvatar } from '@/components/shared/EnsAvatar'
import { getAnticaptureDelegateUrl } from '@/utils/delegation'
import { api, ApiClientError } from '@/api'
import type {
  RewardRank,
  RewardStatus,
  RoundDetailResponse,
  RoundStatus,
} from '@/api/types'
import { RoundDetailPageSkeleton } from '@/components/shared/PageSkeletons'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, ErrorMessage } from '@/styles'
import { formatEnsAmount, truncateAddress } from '@/utils/format'
import { AddressLookupForm } from './components/AddressLookupForm'
import { RewardSourceTag } from './components/RewardTags'
import { formatPositiveReward, statusLabel } from './status'
import {
  buildRoundDetailFallback,
  buildRoundListFromCurrentRound,
} from './roundFallback'

/* ─── Page layout ─── */

const Page = styled.div`
  width: 100%;
  max-width: 1120px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
`

/* ─── Header card ─── */

const HeaderCard = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
  padding: ${tokens.spacing['2xl']};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "back avatar"
      "text avatar";
    column-gap: ${tokens.spacing['4xl']};
    row-gap: ${tokens.spacing['2xl']};
    align-items: stretch;
  }
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
  min-width: 0;
  width: 100%;
  text-align: center;

  @media (min-width: 768px) {
    grid-area: text;
    align-items: stretch;
    text-align: left;
    width: auto;
  }
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const BackLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  align-self: flex-start;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  color: ${tokens.color.blue};
  transition: opacity ${tokens.transition.fast}, gap ${tokens.transition.fast};

  &:hover {
    text-decoration: none;
    opacity: 0.8;
    gap: ${tokens.spacing.sm};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: 4px;
  }

  @media (min-width: 768px) {
    grid-area: back;
  }
`

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${tokens.spacing.md};
`

const NameTitle = styled.h1`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  letter-spacing: -0.02em;
  word-break: break-word;
  text-wrap: balance;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['5xl']};
  }
`

const StatusTag = styled.span<{ $status: RoundStatus | RewardStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 14px;
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.bg
      : $status === 'paid'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.status.success.fg
      : $status === 'paid'
        ? tokens.color.blue
        : tokens.color.darkGray};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  white-space: nowrap;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: currentColor;
    flex-shrink: 0;
  }
`

const CtaRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: 100%;

  @media (min-width: 768px) {
    width: auto;
  }
`

const RoundNavButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  border: 1px solid ${tokens.color.borderLight};
  background: ${tokens.color.surface};
  color: ${tokens.color.darkBlue};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  cursor: pointer;
  white-space: nowrap;
  flex: 1;

  @media (min-width: 768px) {
    flex: 0 0 auto;
  }
  transition:
    border-color ${tokens.transition.fast},
    color ${tokens.transition.fast},
    gap ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 10px;
    height: 10px;
  }

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }

  &:disabled {
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
    opacity: 0.6;
  }
`

const DownloadCsvButton = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  color: ${tokens.color.blue};
  font-family: inherit;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity ${tokens.transition.fast}, gap ${tokens.transition.fast};

  svg {
    color: currentColor;
    width: 12px;
    height: 12px;
  }

  &:hover:not(:disabled) {
    opacity: 0.8;
    gap: 8px;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: 4px;
  }

  &:disabled {
    color: ${tokens.color.textSubtle};
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 767px) {
    align-self: center;
  }
`

/* ─── Avatar column with round badge ─── */

const AvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${tokens.spacing.sm};
  flex-shrink: 0;

  @media (min-width: 768px) {
    grid-area: avatar;
    align-self: center;
  }
`

const RingWrap = styled.div`
  position: relative;
  width: 220px;
  height: 220px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 240px;
    height: 240px;
  }
`

const RingSvg = styled.svg`
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`

const RingCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  pointer-events: none;
`

const RingDateRange = styled.span`
  font-size: 44px;
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;

  @media (min-width: 768px) {
    font-size: 56px;
  }
`

const RingMonth = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

interface RoundProgressRingProps {
  percent: number
  startDate: string
  endDate: string
  status: RoundStatus
}

function RoundProgressRing({
  percent,
  startDate,
  endDate,
  status,
}: RoundProgressRingProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [measuredSize, setMeasuredSize] = useState(220)
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const next = Math.max(180, Math.min(rect.width, rect.height || rect.width))
      setMeasuredSize(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => setAnimatedPct(percent), 120)
    return () => window.clearTimeout(handle)
  }, [percent])

  const stroke = 12
  const radius = (measuredSize - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safePct = Math.max(0, Math.min(100, animatedPct))
  const offset = circumference - (safePct / 100) * circumference

  const ringColor =
    status === 'live'
      ? tokens.color.positiveEmphasis
      : status === 'paid'
        ? tokens.color.blue
        : tokens.color.textSubtle

  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDay = Number.isNaN(start.getTime()) ? '' : start.getUTCDate()
  const endDay = Number.isNaN(end.getTime()) ? '' : end.getUTCDate()
  const monthLabel = Number.isNaN(start.getTime())
    ? ''
    : start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })

  return (
    <RingWrap ref={wrapRef} aria-label={`${Math.round(percent)}% complete`}>
      <RingSvg
        viewBox={`0 0 ${measuredSize} ${measuredSize}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <circle
          cx={measuredSize / 2}
          cy={measuredSize / 2}
          r={radius}
          fill="none"
          stroke={tokens.color.borderLight}
          strokeWidth={stroke}
        />
        <circle
          cx={measuredSize / 2}
          cy={measuredSize / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease',
          }}
        />
      </RingSvg>
      <RingCenter>
        <RingDateRange>
          {startDay}
          {'-'}
          {endDay}
        </RingDateRange>
        <RingMonth>{monthLabel}</RingMonth>
      </RingCenter>
    </RingWrap>
  )
}

/* ─── Stats row ─── */

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const StatTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`

const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['3xl']};
  }
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

/* ─── Address inspector ─── */

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  width: 100%;
  padding: ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const SectionLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SectionLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const AddressResultStrip = styled.div<{ $tone: 'success' | 'neutral' | 'pending' }>`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  border-radius: 12px;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.bg
      : $tone === 'pending'
        ? tokens.color.lightBlueOpacity
        : tokens.color.bgSubtle};
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'success'
        ? tokens.color.status.success.border
        : $tone === 'pending'
          ? tokens.color.lightBlue
          : tokens.color.borderLight};
`

const AddressResultIcon = styled.span<{ $tone: 'success' | 'neutral' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.border
      : $tone === 'pending'
        ? tokens.color.lightBlue
        : tokens.color.borderLight};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.white
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const AddressResultText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const AddressResultTitle = styled.span<{ $tone: 'success' | 'neutral' | 'pending' }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? tokens.color.status.success.fg
      : $tone === 'pending'
        ? tokens.color.blue
        : tokens.color.darkBlue};
`

const AddressResultBody = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkBlue};
  line-height: 1.5;
`

/* ─── Rewards table (Voter Profile pattern) ─── */

const TableCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: 12px;
  overflow: hidden;
  background: ${tokens.color.surface};

  @media (max-width: 767px) {
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;
    gap: 12px;
  }
`

const TableCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderLight};
  flex-wrap: wrap;

  @media (max-width: 767px) {
    padding: 0 4px 8px;
    background: transparent;
    border-bottom: none;
  }
`

const TableHeadRow = styled.div`
  display: flex;
  background: ${tokens.color.bgSubtle};
  border-bottom: 1px solid ${tokens.color.borderLight};

  @media (max-width: 767px) {
    display: none;
  }
`

const TableHeadCell = styled.div<{ $weight?: number; $align?: 'start' | 'end' }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  padding: 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkGray};
  line-height: 20px;
`

const TableRow = styled.a<{ $highlighted?: boolean }>`
  display: flex;
  width: 100%;
  background: ${({ $highlighted }) =>
    $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${tokens.color.borderLight};
  }

  &:hover {
    text-decoration: none;
    background: ${tokens.color.bgSubtle};
  }

  @media (max-width: 767px) {
    flex-direction: column;
    padding: 16px;
    gap: 4px;
    border: 1px solid
      ${({ $highlighted }) =>
        $highlighted ? tokens.color.blue : tokens.color.borderLight};
    border-radius: 12px;
    background: ${({ $highlighted }) =>
      $highlighted ? tokens.color.lightBlueOpacity : tokens.color.surface};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

    &:not(:last-child) {
      border-bottom: 1px solid
        ${({ $highlighted }) =>
          $highlighted ? tokens.color.blue : tokens.color.borderLight};
    }
  }
`

const TableCell = styled.div<{ $weight?: number; $align?: 'start' | 'end'; $primary?: boolean }>`
  flex: ${({ $weight }) => $weight ?? 1};
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: ${({ $align }) => ($align === 'end' ? 'flex-end' : 'flex-start')};
  gap: ${tokens.spacing.sm};
  padding: 14px 12px;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    width: 100%;
    flex: none;
    justify-content: space-between;
    padding: 6px 0;
    white-space: normal;
    ${({ $primary }) =>
      $primary
        ? `
          justify-content: flex-start;
          font-weight: ${tokens.font.weight.bold};
          color: ${tokens.color.darkBlue};
          font-size: ${tokens.font.size.lg};
          padding: 2px 0 10px;
          margin-bottom: 4px;
          border-bottom: 1px solid ${tokens.color.borderLight};
        `
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

const RankPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  border-radius: 9999px;
  background: ${tokens.color.bgSubtle};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const AddressText = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${tokens.color.darkBlue};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const VotingPowerText = styled.span`
  color: ${tokens.color.darkBlue};
  font-variant-numeric: tabular-nums;
`

const RewardCellRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  width: 100%;
`

const RewardValueText = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const EmptyTableBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: ${tokens.spacing['3xl']} ${tokens.spacing.xl};
  text-align: center;
  background: ${tokens.color.bgSubtle};
  border-radius: 12px;
`

const EmptyTableTextStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const EmptyTableIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: ${tokens.color.borderLight};
  color: ${tokens.color.darkGray};

  svg {
    width: 16px;
    height: 16px;
  }
`

const EmptyTableTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 20px;
`

const EmptyTableBodyText = styled.span`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
  max-width: 320px;
`

/* ─── Helpers ─── */

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function isLegacyEndpointError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404
}

function formatEns(value: string | null, empty = '—', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

/**
 * Format an ENS pool amount in compact form using a comma decimal — e.g.
 * "12,5K ENS" / "1,2M ENS". Smaller amounts render as a plain integer.
 */
function formatPoolEns(value: string | null): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10
    const text = (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)).replace('.', ',')
    return `${text}M ENS`
  }
  if (n >= 1_000) {
    const k = Math.round((n / 1_000) * 10) / 10
    const text = (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)).replace('.', ',')
    return `${text}K ENS`
  }
  return `${Math.round(n).toLocaleString('en-US')} ENS`
}

function computeRoundProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const now = Date.now()
  if (now <= start) return 0
  if (now >= end) return 100
  return ((now - start) / (end - start)) * 100
}

function formatVotingPower(vpWei: string | null): string {
  if (!vpWei) return '—'
  const ens = Number(vpWei) / 1e18
  if (!Number.isFinite(ens)) return '—'
  if (ens >= 1_000_000) {
    const m = ens / 1_000_000
    const rounded = Math.round(m * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M ENS`
  }
  if (ens >= 1_000) {
    const k = ens / 1_000
    const rounded = Math.round(k * 10) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K ENS`
  }
  return `${formatEnsAmount(ens.toString())} ENS`
}

function formatVpGrowth(value: string | null): string {
  if (value == null) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n > 0) return `+${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function buildRoundPath(roundNumber: number, activeAddress: string, activeAddressValid: boolean): string {
  const addressQuery = activeAddress && activeAddressValid
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  return `/rounds/${roundNumber}${addressQuery}`
}

/* ─── Rewards table ─── */

interface RewardsTableProps {
  rows: RewardRank[]
  highlightAddress: string
  showVotingPower: boolean
}

function RewardsTable({ rows, highlightAddress, showVotingPower }: RewardsTableProps) {
  const highlightLower = highlightAddress.toLowerCase()

  if (rows.length === 0) {
    return (
      <EmptyTableBody>
        <EmptyTableIcon aria-hidden>
          <FontAwesomeIcon icon={faUserSlash} />
        </EmptyTableIcon>
        <EmptyTableTextStack>
          <EmptyTableTitle>No recipients in this round</EmptyTableTitle>
          <EmptyTableBodyText>
            Nothing got paid out here yet.<br />Check back once the round closes.
          </EmptyTableBodyText>
        </EmptyTableTextStack>
      </EmptyTableBody>
    )
  }

  return (
    <>
      <TableHeadRow>
        <TableHeadCell $weight={0.6}>Rank</TableHeadCell>
        <TableHeadCell $weight={2}>Delegate</TableHeadCell>
        {showVotingPower ? (
          <TableHeadCell $weight={1.2} $align="end">Voting power</TableHeadCell>
        ) : null}
        <TableHeadCell $weight={1.4} $align="end">Reward</TableHeadCell>
      </TableHeadRow>
      {rows.map((row) => {
        const isHighlighted =
          highlightLower !== '' && row.address.toLowerCase() === highlightLower
        const displayName = row.ensName ?? truncateAddress(row.address)
        return (
          <TableRow
            key={`${row.role}-${row.rank}-${row.address}`}
            href={getAnticaptureDelegateUrl(row.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${displayName} on Anticapture`}
            $highlighted={isHighlighted}
            aria-current={isHighlighted ? 'true' : undefined}
          >
            <TableCell $weight={0.6}>
              <MobileLabel>Rank</MobileLabel>
              <RankPill>#{row.rank}</RankPill>
            </TableCell>
            <TableCell $weight={2} $primary>
              <EnsAvatar
                address={row.address}
                name={row.ensName ?? undefined}
                size={28}
              />
              <AddressText>{displayName}</AddressText>
            </TableCell>
            {showVotingPower ? (
              <TableCell $weight={1.2} $align="end">
                <MobileLabel>Voting power</MobileLabel>
                <VotingPowerText>{formatVotingPower(row.votingPower)}</VotingPowerText>
              </TableCell>
            ) : null}
            <TableCell $weight={1.4} $align="end">
              <MobileLabel>Reward</MobileLabel>
              <RewardCellRow>
                <RewardValueText>{formatPositiveReward(row.rewardEns) ?? '—'}</RewardValueText>
                <RewardSourceTag source={row.source} />
              </RewardCellRow>
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
}

/* ─── Component ─── */

export function RoundDetailPage() {
  const navigate = useNavigate()
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

  const fetchRound = useCallback(async () => {
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
  }, [roundNumber, activeAddress, activeAddressValid])
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
  // Always fetch the rounds list — used both for prev/next nav and to pull
  // real dates / status / pool / tier per round (so navigation reflects each
  // round's actual data, not the mock detail body).
  const roundList = useAsync(fetchRoundList)

  // Live current round payload — finer-grained progress for the ongoing round.
  const fetchCurrentRound = useCallback(() => api.currentRound(), [])
  const currentRound = useAsync(fetchCurrentRound)

  // Tier progression — used to surface the APR of the tier the round reached.
  const fetchTierProgression = useCallback(() => api.tierProgression(), [])
  const tierProgression = useAsync(fetchTierProgression)

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
    () =>
      (roundList.data?.rounds ?? [])
        .map((candidate) => candidate.roundNumber)
        .sort((a, b) => a - b),
    [roundList.data],
  )

  // Real summary for the round currently being viewed — drives dates/status/
  // pool/tier on the right-side ring + stats so prev/next show each round.
  const viewedRoundSummary = useMemo(
    () =>
      (roundList.data?.rounds ?? []).find(
        (candidate) => candidate.roundNumber === roundNumber,
      ) ?? null,
    [roundList.data, roundNumber],
  )

  const previousRoundNumber = availableRoundNumbers
    .filter((candidate) => candidate < roundNumber)
    .at(-1) ?? null
  const nextRoundNumber =
    availableRoundNumbers.find((candidate) => candidate > roundNumber) ?? null

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
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <ErrorMessage>Unknown round.</ErrorMessage>
      </Page>
    )
  }

  if (round.error || !round.data) {
    return (
      <Page>
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <ErrorMessage>Failed to load round data: {round.error}</ErrorMessage>
      </Page>
    )
  }

  const roundData: RoundDetailResponse = round.data

  // Title follows the round being viewed (URL), so prev/next navigation updates it.
  const titleRoundNumber = roundData.roundNumber

  const csvAvailable = roundData.distributionDataStatus === 'available'

  const hasActiveAddress = Boolean(activeAddress && activeAddressValid)

  const lotteryShareValue =
    roundData.lotteryPrizeEns != null
      ? `${formatEnsAmount(roundData.lotteryPrizeEns, { maximumFractionDigits: 2 })} ENS`
      : '—'

  // Priority: live current-round payload (when viewing the ongoing round) →
  // the rounds-list summary for the viewed round → round detail fallback.
  const liveCurrentRound = currentRound.data ?? null
  const isViewingLiveRound =
    liveCurrentRound != null &&
    liveCurrentRound.roundNumber === roundNumber

  const displayStartDate =
    (isViewingLiveRound ? liveCurrentRound.startDate : null) ??
    viewedRoundSummary?.startDate ??
    roundData.startDate
  const displayEndDate =
    (isViewingLiveRound ? liveCurrentRound.endDate : null) ??
    viewedRoundSummary?.endDate ??
    roundData.endDate
  const displayStatus: RoundStatus =
    viewedRoundSummary?.status ?? roundData.status
  // Closed rounds: full ring. Pending: empty. Live: compute the actual percent
  // from the round's start/end window (always accurate, no dependency on an
  // API field that may not refresh between deploys).
  const displayPercentComplete =
    displayStatus === 'paid' || displayStatus === 'ended'
      ? 100
      : displayStatus === 'live'
        ? computeRoundProgress(displayStartDate, displayEndDate)
        : 0
  const displayPoolSizeEns =
    (isViewingLiveRound ? liveCurrentRound.poolSizeEns : null) ??
    viewedRoundSummary?.poolSizeEns ??
    roundData.poolSizeEns ??
    null
  const reachedTierIndex =
    (isViewingLiveRound ? liveCurrentRound.tierIndex : null) ??
    viewedRoundSummary?.tierIndex ??
    roundData.tierIndex ??
    null
  const displayTierLabel =
    viewedRoundSummary?.tierLabel ??
    (reachedTierIndex != null ? `Tier ${reachedTierIndex + 1}` : '—')

  const reachedTier =
    reachedTierIndex != null
      ? tierProgression.data?.tiers[reachedTierIndex] ?? null
      : null
  const tierAprSubLabel =
    reachedTier?.estimatedAprPct != null
      ? `${reachedTier.estimatedAprPct}% APR reached`
      : 'Tier reached'

  // Address inspector result strip
  const addressInsight: { tone: 'success' | 'neutral' | 'pending'; title: string; body: string } =
    !hasActiveAddress
      ? {
          tone: 'neutral',
          title: 'Check a wallet',
          body: 'Paste an ENS name or 0x address above to see what it earned this round.',
        }
      : roundData.distributionDataStatus !== 'available'
        ? {
            tone: 'pending',
            title: 'This round hasn’t finished yet',
            body: `Round ${roundData.roundNumber} is still ${roundData.status}. Results show up the moment it closes.`,
          }
        : roundData.addressReward && Number(roundData.addressReward.totalRewardEns) > 0
          ? {
              tone: 'success',
              title: `Earned ${formatEns(roundData.addressReward.totalRewardEns, '0 ENS')}`,
              body: 'Your reward landed in a single transfer.',
            }
          : {
              tone: 'neutral',
              title: 'No reward this round',
              body: 'This wallet didn’t earn anything in this round.',
            }

  return (
    <Page key={roundNumber}>
      <HeaderCard>
        <BackLinkButton type="button" onClick={() => navigate(backTo)}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to rounds
        </BackLinkButton>
        <AvatarColumn>
          <RoundProgressRing
            percent={displayPercentComplete}
            startDate={displayStartDate}
            endDate={displayEndDate}
            status={displayStatus}
          />
          <StatusTag $status={displayStatus}>{statusLabel(displayStatus)}</StatusTag>
        </AvatarColumn>
        <HeaderText>
          <TitleBlock>
            <NameRow>
              <NameTitle>Round {titleRoundNumber}</NameTitle>
            </NameRow>
            <DownloadCsvButton
              type="button"
              disabled={!csvAvailable}
              aria-label={
                csvAvailable
                  ? `Download Round ${titleRoundNumber} CSV`
                  : `CSV unavailable: Round ${titleRoundNumber} data is not ready yet`
              }
              title={
                csvAvailable
                  ? 'Download distribution CSV'
                  : 'CSV available once the round closes'
              }
              onClick={() => api.downloadDistributionCsv(roundData.month)}
            >
              <FontAwesomeIcon icon={faDownload} />
              Download CSV
            </DownloadCsvButton>
          </TitleBlock>
          <CtaRow>
            <RoundNavButton
              type="button"
              onClick={() =>
                previousRoundNumber != null &&
                navigate(buildRoundPath(previousRoundNumber, activeAddress, activeAddressValid))
              }
              disabled={previousRoundNumber == null}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              {previousRoundNumber != null ? `Round ${previousRoundNumber}` : 'Previous'}
            </RoundNavButton>
            <RoundNavButton
              type="button"
              onClick={() =>
                nextRoundNumber != null &&
                navigate(buildRoundPath(nextRoundNumber, activeAddress, activeAddressValid))
              }
              disabled={nextRoundNumber == null}
            >
              {nextRoundNumber != null ? `Round ${nextRoundNumber}` : 'Next'}
              <FontAwesomeIcon icon={faArrowRight} />
            </RoundNavButton>
          </CtaRow>
        </HeaderText>
      </HeaderCard>

      <StatsRow>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatPoolEns(displayPoolSizeEns)}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faCoins} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Pool size</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{displayTierLabel}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faRankingStar} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>{tierAprSubLabel}</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{formatVpGrowth(roundData.vpGrowthPct)}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faArrowTrendUp} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>VP growth</StatLabel>
        </StatCard>
        <StatCard>
          <StatTopRow>
            <StatValue>{lotteryShareValue}</StatValue>
            <StatIconBox aria-hidden>
              <FontAwesomeIcon icon={faTrophy} />
            </StatIconBox>
          </StatTopRow>
          <StatLabel>Lottery prize</StatLabel>
        </StatCard>
      </StatsRow>

      <Section>
        <SectionHeader>
          <SectionLabelGroup>
            <SectionLabel>Check a wallet</SectionLabel>
            <SectionTitle>See what this round paid an address</SectionTitle>
          </SectionLabelGroup>
        </SectionHeader>
        <AddressLookupForm
          value={addressInput}
          activeAddress={activeAddress}
          sourceLabel={sourceLabel}
          error={addressError}
          connectedAddress={walletAddress || undefined}
          onChange={setAddressInput}
          onSubmit={handleAddressSubmit}
          onClear={handleAddressClear}
        />
        <AddressResultStrip $tone={addressInsight.tone}>
          <AddressResultIcon $tone={addressInsight.tone} aria-hidden>
            <FontAwesomeIcon
              icon={
                addressInsight.tone === 'success'
                  ? faCircleCheck
                  : addressInsight.tone === 'pending'
                    ? faHourglassHalf
                    : hasActiveAddress
                      ? faCircleInfo
                      : faMagnifyingGlass
              }
            />
          </AddressResultIcon>
          <AddressResultText>
            <AddressResultTitle $tone={addressInsight.tone}>{addressInsight.title}</AddressResultTitle>
            <AddressResultBody>{addressInsight.body}</AddressResultBody>
          </AddressResultText>
        </AddressResultStrip>
      </Section>

      <TableCard>
        <TableCardHeader>
          <SectionLabelGroup>
            <SectionLabel>Top voter rewards</SectionLabel>
            <SectionTitle>Top delegates this round</SectionTitle>
          </SectionLabelGroup>
        </TableCardHeader>
        <RewardsTable
          rows={roundData.topVoterRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          showVotingPower
        />
      </TableCard>

      <TableCard>
        <TableCardHeader>
          <SectionLabelGroup>
            <SectionLabel>Top token holder rewards</SectionLabel>
            <SectionTitle>Top holders this round</SectionTitle>
          </SectionLabelGroup>
        </TableCardHeader>
        <RewardsTable
          rows={roundData.topTokenHolderRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          showVotingPower={false}
        />
      </TableCard>
    </Page>
  )
}

