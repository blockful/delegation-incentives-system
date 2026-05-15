import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { isAddress } from 'viem'
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
import { StatStrip } from '@/components/shared/StatStrip/StatStrip'
import { StatCard } from '@/components/shared/StatCard'
import { ToneCallout, type ToneCalloutTone } from '@/components/shared/ToneCallout'
import { tokens, fadeInUp, Eyebrow, PageTitle, ErrorMessage } from '@/styles'
import { formatEnsAmount, formatUtcMonthRange, truncateAddress } from '@/utils/format'
import { AddressLookupForm } from './components/AddressLookupForm'
import {
  buildRoundDetailFallback,
  buildRoundListFromCurrentRound,
} from './roundFallback'

const Page = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;
  min-width: 0;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
  }
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const BackLink = styled(Link)`
  color: ${tokens.color.blue};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  width: fit-content;

  &:hover {
    text-decoration: underline;
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const RoundNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
  flex-wrap: wrap;
`

const RoundNavButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    border-color: ${tokens.color.blue};
    color: ${tokens.color.blue};
  }
`

const DisabledRoundNavButton = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  opacity: 0.55;
  white-space: nowrap;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.lg};
  flex-wrap: wrap;
`

const StatusPill = styled.span<{ $status: RoundStatus | RewardStatus }>`
  display: inline-flex;
  align-items: center;
  justify-self: start;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  padding: 4px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.lightBlueOpacity
      : $status === 'paid'
        ? tokens.color.tierHighlight
        : tokens.color.borderLight};
  color: ${({ $status }) =>
    $status === 'live'
      ? tokens.color.blue
      : $status === 'paid'
        ? tokens.color.positiveEmphasis
        : tokens.color.darkGray};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  width: 100%;
  max-width: 680px;
`

const WideSectionHeader = styled(SectionHeader)`
  max-width: 840px;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  line-height: 1.25;
`

const RowCount = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
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

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.spacing.md};
  width: 100%;
  max-width: 840px;

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const MetaLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
`

const MetaValue = styled.span`
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  overflow-wrap: anywhere;
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
  max-width: 840px;
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

function formatBlockNumber(value: string): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return value
  return `#${numericValue.toLocaleString('en-US')}`
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
  tone: ToneCalloutTone
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
      title: 'No address selected',
      body: 'Enter an address above to see whether it had a lottery entry, which bucket it entered, and whether it won.',
      metrics: [
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Buckets entered', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (!activeAddressValid) {
    return {
      tone: 'danger',
      title: 'Invalid address',
      body: 'Enter a valid Ethereum address before checking lottery participation.',
      metrics: [
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Buckets entered', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (round.distributionDataStatus !== 'available') {
    return {
      tone: 'pending',
      title: 'Lottery pending',
      body: 'Final lottery entries are not available until this round has completed distribution data.',
      metrics: [
        { label: 'Round status', value: statusLabel(round.status) },
        { label: 'Lottery entry', value: 'Pending' },
        { label: 'Lottery reward', value: 'Pending' },
      ],
    }
  }

  if (!round.lottery) {
    return {
      tone: 'neutral',
      title: 'No lottery data',
      body: 'This round does not have lottery bucket data available.',
      metrics: [
        { label: 'Lottery entry', value: 'Unavailable' },
        { label: 'Buckets entered', value: '0' },
        { label: 'Lottery reward', value: '0 ENS' },
      ],
    }
  }

  const entries = getAddressLotteryEntries(round.lottery, activeAddress)
  const winningEntries = entries.filter((item) => item.won)

  if (winningEntries.length > 0) {
    return {
      tone: 'success',
      title: winningEntries.length === 1
        ? `Won bucket #${winningEntries[0].bucket.bucketIndex + 1}`
        : `Won ${winningEntries.length} buckets`,
      body: 'This address was selected by the final deterministic draw for the selected round.',
      metrics: [
        { label: 'Lottery reward', value: formatEns(round.addressReward?.lotteryRewardEns ?? null, '0 ENS') },
        { label: 'Buckets won', value: bucketList(winningEntries) },
        { label: 'Best weighted odds', value: bestEntryProbability(winningEntries) },
      ],
    }
  }

  if (entries.length > 0) {
    return {
      tone: 'warning',
      title: 'Entered lottery, not selected',
      body: 'This address had a sub-1 ENS calculated reward and entered the lottery, but another entry won the bucket.',
      metrics: [
        { label: 'Buckets entered', value: bucketList(entries) },
        { label: 'Entry amount', value: sumEntryAmountEns(entries) },
        { label: 'Best weighted odds', value: bestEntryProbability(entries) },
      ],
    }
  }

  if (hasDirectReward(round)) {
    return {
      tone: 'success',
      title: 'Direct payout, no lottery entry',
      body: 'This address received at least 1 ENS directly, so it did not enter a lottery bucket for this round.',
      metrics: [
        { label: 'Direct reward', value: formatEns(round.addressReward?.totalRewardEns ?? null, '0 ENS') },
        { label: 'Lottery entry', value: 'No' },
        { label: 'Lottery reward', value: '0 ENS' },
      ],
    }
  }

  return {
    tone: 'neutral',
    title: 'No lottery entry for this round',
    body: 'This address was not present in the final lottery entries for the selected round.',
    metrics: [
      { label: 'Lottery entry', value: 'No' },
      { label: 'Buckets entered', value: '0' },
      { label: 'Lottery reward', value: '0 ENS' },
    ],
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
  return `${lottery.bucketCount.toLocaleString('en-US')} ${lottery.bucketCount === 1 ? 'bucket' : 'buckets'}`
}

function lotteryEntryCountLabel(lottery: LotteryDetail | null): string {
  if (!lottery) return 'Unavailable'
  return `${lottery.entryCount.toLocaleString('en-US')} ${lottery.entryCount === 1 ? 'entry' : 'entries'}`
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
    return <EmptyState>No lottery results.</EmptyState>
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
            <Th>Bucket</Th>
            <Th>Winner</Th>
            <Th>Prize</Th>
            <Th>Entries</Th>
            <Th>Chance</Th>
          </tr>
        </Thead>
        <Tbody>
          {buckets.map((bucket) => (
            <Row key={bucket.bucketIndex}>
              <Td data-label="Bucket">#{bucket.bucketIndex + 1}</Td>
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
              <Td data-label="Chance">{formatProbability(bucket.winnerProbability)}</Td>
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
    return <EmptyState>No lottery entries.</EmptyState>
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
              <Th>Bucket</Th>
              <Th>Address</Th>
              <Th>Amount</Th>
              <Th>Chance</Th>
            </tr>
          </Thead>
          <Tbody>
            {entries.map((entry) => (
              <Row key={`${entry.bucketIndex}-${entry.entryIndex}-${entry.address}`}>
                <Td data-label="Bucket">#{entry.bucketIndex + 1}</Td>
                <Td data-label="Address">
                  <CopyableAddress
                    address={entry.address}
                    ensName={entry.ensName}
                    resolveEns={false}
                    showEnsName
                  />
                </Td>
                <Td data-label="Amount">{formatEns(entry.amountEns, '0 ENS')}</Td>
                <Td data-label="Chance">{formatProbability(entry.probability)}</Td>
              </Row>
            ))}
          </Tbody>
        </Table>
      </WideTableWrap>
      {entries.length < totalCount ? (
        <TableNote>
          Showing the first {entries.length.toLocaleString('en-US')} entries. Use the address inspector above
          for exact wallet participation.
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

  return (
    <AddressLotteryWrapper>
      <ToneCallout
        tone={insight.tone}
        title={insight.title}
        body={insight.body}
        metrics={insight.metrics.map((m) => ({ label: m.label, value: m.value }))}
      >
        {activeAddress && activeAddressValid ? (
          <AddressLotteryAddressRow>
            <span>Selected address:</span>
            <CopyableAddress address={activeAddress} resolveEns={false} showEnsName />
          </AddressLotteryAddressRow>
        ) : null}
      </ToneCallout>
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
      <WideSectionHeader>
        <div>
          <Eyebrow>Methodology</Eyebrow>
          <SectionTitle>Same code that ran for every round.</SectionTitle>
        </div>
      </WideSectionHeader>
      <MethodologyCard>
        {lottery && seedHasValue ? (
          <MethodologyRow>
            <MethodologyRowLabel>RANDAO seed</MethodologyRowLabel>
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
          <MethodologyRowLabel>Algorithm</MethodologyRowLabel>
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
        <BackLink to={backTo}>Back to rounds</BackLink>
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

  return (
    <Page>
      {/* 1. BackLink */}
      <Header>
        <HeaderActions>
          <BackLink to={backTo}>Back to rounds</BackLink>
          <RoundNav aria-label="Round navigation">
            {previousRoundNumber == null ? (
              <DisabledRoundNavButton aria-disabled="true">Previous round</DisabledRoundNavButton>
            ) : (
              <RoundNavButton to={buildRoundPath(previousRoundNumber, activeAddress, activeAddressValid)}>
                Previous round
              </RoundNavButton>
            )}
            {nextRoundNumber == null ? (
              <DisabledRoundNavButton aria-disabled="true">Next round</DisabledRoundNavButton>
            ) : (
              <RoundNavButton to={buildRoundPath(nextRoundNumber, activeAddress, activeAddressValid)}>
                Next round
              </RoundNavButton>
            )}
          </RoundNav>
        </HeaderActions>
        {/* 2. Header */}
        <TitleRow>
          <div>
            <Eyebrow>Round Details</Eyebrow>
            <PageTitle>Round {roundData.roundNumber}</PageTitle>
          </div>
          <StatusPill $status={roundData.status}>{statusLabel(roundData.status)}</StatusPill>
        </TitleRow>
        <AddressLookupForm
          value={addressInput}
          activeAddress={activeAddress}
          sourceLabel={sourceLabel}
          error={addressError}
          onChange={setAddressInput}
          onSubmit={handleAddressSubmit}
          onClear={handleAddressClear}
        />
      </Header>

      {/* 3. Your Result (only when activeAddress is set) */}
      {hasActiveAddress ? (
        <Section>
          <WideSectionHeader>
            <Eyebrow>Your Result</Eyebrow>
            <RowCount>{formatAddressReward(roundData.addressReward)}</RowCount>
          </WideSectionHeader>
          <AddressLotteryInsightPanel
            round={roundData}
            activeAddress={activeAddress}
            activeAddressValid={activeAddressValid}
          />
        </Section>
      ) : null}

      {/* 4. Round overview stat strip */}
      <Section>
        <WideSectionHeader>
          <Eyebrow>Round Overview</Eyebrow>
          <RowCount>{formatUtcMonthRange(roundData.startDate, roundData.endDate)}</RowCount>
        </WideSectionHeader>
        <StatStrip columns={4}>
          <StatCard
            label="Pool"
            value={formatEns(roundData.poolSizeEns, 'Unavailable', 0)}
          />
          <StatCard
            label="Recipients"
            value={formatCount(recipientsCount, '0')}
            sub={recipientsCount === 1 ? 'unique' : 'unique'}
          />
          <StatCard
            label="Total paid"
            value={formatEns(
              roundData.totalDistributedEns,
              roundData.status === 'live' ? 'Pending' : 'Unavailable',
            )}
          />
          <StatCard
            label="Lottery share"
            value={lotteryShareValue}
            sub={lotteryShareSub}
          />
        </StatStrip>
      </Section>

      {/* 5. Methodology card */}
      <MethodologySection round={roundData} />

      {/* 6. Recipients table */}
      <Section>
        <SectionHeader>
          <Eyebrow>Delegate Rewards</Eyebrow>
          <RowCount>{rewardCountLabel(roundData.topVoterRewards.length)}</RowCount>
        </SectionHeader>
        <RecipientsTable
          rows={roundData.topVoterRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          searchLabel="delegates"
        />
      </Section>

      <Section>
        <SectionHeader>
          <Eyebrow>Token Holder Rewards</Eyebrow>
          <RowCount>{rewardCountLabel(roundData.topTokenHolderRewards.length)}</RowCount>
        </SectionHeader>
        <RecipientsTable
          rows={roundData.topTokenHolderRewards}
          highlightAddress={hasActiveAddress ? activeAddress : ''}
          searchLabel="token-holders"
        />
      </Section>

      {/* 7. Lottery transparency recap card */}
      {roundData.lottery ? (
        <Section>
          <WideSectionHeader>
            <Eyebrow>Lottery Results</Eyebrow>
            <RowCount>{lotteryBucketCountLabel(roundData.lottery)}</RowCount>
          </WideSectionHeader>
          <MetaGrid>
            <MetaItem>
              <MetaLabel>Seed Source</MetaLabel>
              <MetaValue>{roundData.lottery.seed.label}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Seed Block</MetaLabel>
              <MetaValue>{formatBlockNumber(roundData.lottery.seed.blockNumber)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Total Lottery Prizes</MetaLabel>
              <MetaValue>{formatEns(roundData.lotteryPrizeEns, '0 ENS')}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Participants</MetaLabel>
              <MetaValue>{roundData.lottery.participantCount.toLocaleString('en-US')}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Entries</MetaLabel>
              <MetaValue>{formatCount(roundData.lotteryEntryCount)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Winners</MetaLabel>
              <MetaValue>{formatCount(roundData.lotteryWinnerCount)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Bucket Target</MetaLabel>
              <MetaValue>{formatEns(roundData.lottery.bucketTargetEns, '0 ENS')}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Algorithm</MetaLabel>
              <MetaValue>{roundData.lottery.seed.algorithm}</MetaValue>
            </MetaItem>
          </MetaGrid>
          <LotteryBucketTable buckets={roundData.lottery.buckets} />

          <WideSectionHeader>
            <Eyebrow>Lottery Entries</Eyebrow>
            <RowCount>
              {visibleLotteryEntryCountLabel(lotteryEntries.length, visibleLotteryEntries.length)}
            </RowCount>
          </WideSectionHeader>
          <LotteryEntryTable entries={visibleLotteryEntries} totalCount={lotteryEntries.length} />
        </Section>
      ) : (
        <Section>
          <WideSectionHeader>
            <Eyebrow>Lottery Results</Eyebrow>
            <RowCount>{lotteryEntryCountLabel(roundData.lottery)}</RowCount>
          </WideSectionHeader>
          <EmptyState>No lottery data.</EmptyState>
          <EmptyState>No lottery entries.</EmptyState>
        </Section>
      )}
    </Page>
  )
}
