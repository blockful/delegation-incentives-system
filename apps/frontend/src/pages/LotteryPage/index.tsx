import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '@ensdomains/thorin'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrophy } from '@fortawesome/free-solid-svg-icons'
import { isAddress } from 'viem'
import { fadeInUp, Eyebrow, PageTitle } from '@/styles'
import { useLottery } from '@/features/lottery/useLottery'
import { useWalletState } from '@/features/wallet/useWalletState'
import { AddressIdentity } from '@/components/shared/AddressIdentity'
import { LotteryPageSkeleton } from '@/components/shared/PageSkeletons'
import { ToneCallout, type ToneCalloutTone } from '@/components/shared/ToneCallout'
import { BucketSlotGrid } from '@/components/shared/BucketSlotGrid'
import type {
  LotteryBucketDetail,
  LotteryDetail,
  LotteryEntryDetail,
  RoundDetailResponse,
  RoundSummary,
} from '@/api/types'
import { formatEnsAmount, formatUtcMonthRange } from '@/utils/format'
import { tokens } from '@/styles/tokens'
import { AddressLookupForm } from '@/pages/RoundsPage/components/AddressLookupForm'

type StatusTone = 'neutral' | 'success' | 'warning' | 'pending' | 'error'

interface AddressLotteryEntry {
  bucket: LotteryBucketDetail
  entry: LotteryEntryDetail
  won: boolean
}

interface StatusMetric {
  label: string
  value: string
}

interface AddressLotteryStatus {
  tone: StatusTone
  title: string
  body: string
  metrics: StatusMetric[]
}

const Page = styled.div`
  width: 100%;
  animation: ${fadeInUp} 0.4s ease both;
`

const HeaderContent = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.xl} ${tokens.spacing.xl} ${tokens.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['3xl']} ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  }
`

const PrizePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.status.success.bg};
  border: 1px solid ${tokens.color.status.success.border};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
`

const PrizePillSparkle = styled.span`
  font-size: ${tokens.font.size.base};
`

const Title = styled(PageTitle)`
  font-size: ${tokens.font.size['3xl']};

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

const Description = styled.p`
  max-width: 680px;
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
`

const CurrentRoundNote = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const Content = styled.div`
  max-width: ${tokens.maxWidth.section};
  margin: 0 auto;
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl} ${tokens.spacing['6xl']};
  display: grid;
  gap: ${tokens.spacing['2xl']};

  @media (min-width: 768px) {
    padding: ${tokens.spacing.xl} ${tokens.spacing['2xl']} ${tokens.spacing['7xl']};
    gap: ${tokens.spacing['3xl']};
  }
`

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${tokens.spacing.lg};

  @media (min-width: 980px) {
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    align-items: stretch;
  }
`

const Panel = styled.section`
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  box-shadow: ${tokens.shadow.sm};
  padding: ${tokens.spacing['2xl']};
  display: grid;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const PanelTitle = styled.h2`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.25;
`

const PanelBody = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.6;
`

const RoundPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 ${tokens.spacing.md};
  border: 1px solid ${tokens.color.middleGray};
  border-radius: ${tokens.radius.pill};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const Stat = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`

const StatValue = styled.span`
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1.2;
  overflow-wrap: anywhere;
`

const StatLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.4;
`

const AddressPanel = styled(Panel)`
  align-content: start;
`

const LinkRow = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`

const TextLink = styled(Link)`
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const ExplorerGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${tokens.spacing.lg};
  align-items: stretch;

  @media (min-width: 980px) {
    grid-template-columns: minmax(280px, 0.36fr) minmax(0, 0.64fr);
  }
`

const NavigatorPanel = styled(Panel)`
  align-content: start;
`

const OptionGroup = styled.div`
  display: grid;
  gap: ${tokens.spacing.sm};
`

const OptionLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
`

const RoundOption = styled(Link)<{ $active?: boolean }>`
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: ${tokens.spacing.md};
  border: 1px solid ${({ $active }) => ($active ? tokens.color.blue : tokens.color.borderLight)};
  border-radius: ${tokens.radius.sm};
  background: ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.white)};
  color: ${tokens.color.darkBlue};
  text-decoration: none;
  transition:
    border-color ${tokens.transition.fast},
    background ${tokens.transition.fast},
    transform ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    background: ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.bgSubtle)};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`

const RoundOptionTop = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.spacing.sm};
  min-width: 0;
`

const RoundOptionTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
`

const RoundOptionMeta = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.4;
  overflow-wrap: anywhere;
`

const StatusBadge = styled.span<{ $status: RoundSummary['status'] }>`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  background: ${({ $status }) => {
    if ($status === 'paid') return tokens.color.tierHighlight
    if ($status === 'live') return tokens.color.lightBlueOpacity
    return tokens.color.borderLight
  }};
  color: ${({ $status }) => {
    if ($status === 'paid') return tokens.color.positiveEmphasis
    if ($status === 'live') return tokens.color.blue
    return tokens.color.darkGray
  }};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const BucketList = styled.div`
  display: grid;
  gap: ${tokens.spacing.xs};
  max-height: 340px;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    max-height: 280px;
  }
`

const BucketOption = styled(Link)<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: ${tokens.spacing.md};
  min-width: 0;
  min-height: 58px;
  padding: 10px ${tokens.spacing.md};
  border: 1px solid ${({ $active }) => ($active ? tokens.color.blue : tokens.color.borderLight)};
  border-radius: ${tokens.radius.sm};
  background: ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.white)};
  color: ${tokens.color.darkBlue};
  text-decoration: none;
  box-shadow: ${({ $active }) => ($active ? tokens.shadow.soft : 'none')};
  transition:
    border-color ${tokens.transition.fast},
    background ${tokens.transition.fast},
    transform ${tokens.transition.fast};

  &:hover {
    border-color: ${tokens.color.blue};
    background: ${({ $active }) => ($active ? tokens.color.lightBlue : tokens.color.bgSubtle)};
    transform: translateX(2px);
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.accent};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`

const BucketOptionTitleRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.sm};
`

const BucketOptionTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const YouPin = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.status.success.bg};
  border: 1px solid ${tokens.color.status.success.border};
  color: ${tokens.color.status.success.fg};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
`

const YouDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${tokens.color.status.success.border};
`

const BucketOptionMeta = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.4;
`

const BucketWinner = styled.span`
  display: grid;
  justify-items: end;
  gap: 1px;
  min-width: 0;
  max-width: 100%;
  text-align: right;
  overflow: hidden;
`

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.spacing.md};

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const ConditionGrid = styled.div`
  display: grid;
  gap: ${tokens.spacing.sm};
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: ${tokens.spacing.lg};

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const ConditionItem = styled.div`
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.spacing.md};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  line-height: 1.45;
`

const ConditionName = styled.strong`
  display: block;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.sm};
  margin-bottom: 2px;
`

const SlotGridSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
  padding-top: ${tokens.spacing.md};
  border-top: 1px solid ${tokens.color.borderLight};
`

const SlotGridCaption = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  line-height: 1.5;
  max-width: 680px;
`

const SubsectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  align-items: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid ${tokens.color.borderLight};
  padding-top: ${tokens.spacing.lg};
`

const SubsectionTitle = styled.h3`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.xl};
  line-height: 1.25;
`

const ParticipantTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 580px;
`

const OddsStack = styled.div`
  display: grid;
  gap: 6px;
`

const OddsMeter = styled.div`
  width: 100%;
  height: 6px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.borderLight};
  overflow: hidden;
`

const OddsFill = styled.span`
  display: block;
  height: 100%;
  border-radius: inherit;
  background: ${tokens.color.blue};
`

const OutcomePill = styled.span<{ $winner?: boolean }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 26px;
  padding: 0 ${tokens.spacing.sm};
  border-radius: ${tokens.radius.pill};
  background: ${({ $winner }) => ($winner ? tokens.color.tierHighlight : tokens.color.borderLight)};
  color: ${({ $winner }) => ($winner ? tokens.color.positiveEmphasis : tokens.color.darkGray)};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const TableWrap = styled.div`
  width: 100%;
  max-width: 100%;
  max-height: 360px;
  min-width: 0;
  overflow: auto;
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    max-height: 320px;
  }
`

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  text-align: left;
  background: ${tokens.color.surface};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0;
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const Td = styled.td`
  padding: ${tokens.spacing.md};
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.base};
  border-bottom: 1px solid ${tokens.color.borderLight};
  vertical-align: middle;
  overflow-wrap: anywhere;
`

const Tr = styled.tr<{ $highlight?: boolean; $winner?: boolean }>`
  background: ${({ $highlight, $winner }) => {
    if ($winner) return tokens.color.tierHighlight
    if ($highlight) return tokens.color.lightBlue
    return 'transparent'
  }};
`

const RewardValue = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const EmptyState = styled.div`
  border: 1px dashed ${tokens.color.borderLight};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.spacing['3xl']};
  color: ${tokens.color.darkGray};
  line-height: 1.6;
  text-align: center;
`

const ErrorCard = styled(Panel)`
  max-width: 680px;
  border-color: ${tokens.color.status.danger.border};
  background: ${tokens.color.status.danger.bg};
`

function getWalletAddress(walletState: ReturnType<typeof useWalletState>): string {
  if (walletState.status === 'disconnected') return ''
  return walletState.address
}

function formatEns(value: string | null | undefined, empty = 'Unavailable', maximumFractionDigits = 4): string {
  if (value == null) return empty
  return `${formatEnsAmount(value, { maximumFractionDigits })} ENS`
}

function formatProbability(value: string | null | undefined): string {
  if (value == null) return 'Unavailable'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Unavailable'
  const pct = numericValue * 100
  if (pct > 0 && pct < 0.01) return '<0.01%'
  return `${pct.toLocaleString('en-US', {
    maximumFractionDigits: pct < 1 ? 3 : 2,
  })}%`
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function buildLotteryHref(
  searchParams: URLSearchParams,
  updates: Partial<Record<'round' | 'bucket' | 'address', string | number | null>>,
): string {
  const next = new URLSearchParams(searchParams)

  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
  }

  const query = next.toString()
  return query ? `/lottery?${query}` : '/lottery'
}

function getRoundLotteryMeta(round: RoundSummary): string {
  if (round.distributionDataStatus !== 'available') {
    if (round.distributionDataStatus === 'in_progress') return 'Draw pending'
    if (round.distributionDataStatus === 'not_started') return 'Not started'
    return 'No final data'
  }

  const bucketCount = round.lotteryBucketCount ?? 0
  const entryCount = round.lotteryEntryCount ?? 0
  if (bucketCount === 0) return 'No lottery buckets'

  return `${bucketCount.toLocaleString('en-US')} ${bucketCount === 1 ? 'bucket' : 'buckets'} · ${entryCount.toLocaleString('en-US')} entries`
}

function findUserBucket(
  lottery: LotteryDetail | null,
  address: string,
): LotteryBucketDetail | null {
  if (!lottery || !address) return null
  return (
    lottery.buckets.find((bucket) =>
      bucket.entries.some((entry) => sameAddress(entry.address, address)),
    ) ?? null
  )
}

function getSelectedBucket(
  lottery: LotteryDetail | null,
  bucketNumber: number | null,
  activeAddress: string,
): LotteryBucketDetail | null {
  if (!lottery || lottery.buckets.length === 0) return null
  if (bucketNumber != null) {
    const requestedIndex = bucketNumber - 1
    return lottery.buckets.find((bucket) => bucket.bucketIndex === requestedIndex)
      ?? lottery.buckets[0]
  }
  return findUserBucket(lottery, activeAddress) ?? lottery.buckets[0]
}

function getBucketParticipantCount(bucket: LotteryBucketDetail): number {
  return new Set(bucket.entries.map((entry) => entry.address.toLowerCase())).size
}

function getOddsWidth(probability: string): string {
  const numericValue = Number(probability)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '0%'
  return `${Math.min(100, Math.max(0, numericValue * 100))}%`
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

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

function buildRoundPath(round: RoundDetailResponse, activeAddress: string, activeAddressValid: boolean): string {
  const addressQuery = activeAddress && activeAddressValid
    ? `?address=${encodeURIComponent(activeAddress)}`
    : ''
  return `/rounds/${round.roundNumber}${addressQuery}`
}

function buildAddressStatus(
  round: RoundDetailResponse,
  activeAddress: string,
  activeAddressValid: boolean,
): AddressLotteryStatus {
  if (!activeAddress) {
    return {
      tone: 'neutral',
      title: 'Inspect an address',
      body: 'Check whether an address entered or won this round.',
      metrics: [
        { label: 'Selected address', value: 'None' },
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (!activeAddressValid) {
    return {
      tone: 'error',
      title: 'Invalid address',
      body: 'Enter a valid Ethereum address.',
      metrics: [
        { label: 'Selected address', value: 'Invalid' },
        { label: 'Lottery entry', value: 'Unknown' },
        { label: 'Lottery reward', value: 'Unknown' },
      ],
    }
  }

  if (round.distributionDataStatus !== 'available') {
    return {
      tone: 'pending',
      title: 'Lottery pending',
      body: 'Final entries are available after the round is paid.',
      metrics: [
        { label: 'Round status', value: round.status },
        { label: 'Lottery entry', value: 'Pending' },
        { label: 'Lottery reward', value: 'Pending' },
      ],
    }
  }

  if (!round.lottery) {
    return {
      tone: 'neutral',
      title: 'No lottery data',
      body: 'This paid round has no lottery buckets.',
      metrics: [
        { label: 'Lottery entry', value: 'Unavailable' },
        { label: 'Buckets', value: '0' },
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
      body: 'This address won a bucket in this paid round.',
      metrics: [
        { label: 'Lottery reward', value: formatEns(round.addressReward?.lotteryRewardEns, '0 ENS') },
        { label: 'Buckets won', value: bucketList(winningEntries) },
        { label: 'Best weighted odds', value: bestEntryProbability(winningEntries) },
      ],
    }
  }

  if (entries.length > 0) {
    return {
      tone: 'warning',
      title: 'Entered lottery, not selected',
      body: 'It entered the lottery, but another participant won.',
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
      body: 'It received at least 1 ENS directly, so it did not enter.',
      metrics: [
        { label: 'Direct reward', value: formatEns(round.addressReward?.totalRewardEns, '0 ENS') },
        { label: 'Lottery entry', value: 'No' },
        { label: 'Lottery reward', value: '0 ENS' },
      ],
    }
  }

  return {
    tone: 'neutral',
    title: 'No lottery entry for this round',
    body: 'No lottery entry in this paid round.',
    metrics: [
      { label: 'Lottery entry', value: 'No' },
      { label: 'Buckets entered', value: '0' },
      { label: 'Lottery reward', value: '0 ENS' },
    ],
  }
}

function getCurrentRoundNote(currentRound: RoundSummary | undefined, selectedRound: RoundDetailResponse): string | null {
  if (!currentRound || currentRound.roundNumber === selectedRound.roundNumber) return null
  if (currentRound.status !== 'live') return null
  return `Current Round ${currentRound.roundNumber} is live. Its lottery entries will be finalized after ${formatUtcMonthRange(currentRound.startDate, currentRound.endDate)}.`
}

function HeaderBlock({
  round,
  currentRound,
}: {
  round?: RoundDetailResponse
  currentRound?: RoundSummary
}) {
  const currentRoundNote = round ? getCurrentRoundNote(currentRound, round) : null

  return (
    <HeaderContent>
      <Eyebrow>Lottery</Eyebrow>
      <Title>Lottery buckets</Title>
      <PrizePill>
        <PrizePillSparkle aria-hidden>
          <FontAwesomeIcon icon={faTrophy} />
        </PrizePillSparkle>
        Win up to 10 ENS
      </PrizePill>
      <Description>
        Sub-1-ENS payouts pool into ~10 ENS buckets. RANDAO seeds a weighted draw at round close, and one winner takes each bucket. Inspect any wallet, round, or bucket below.
      </Description>
      {round ? (
        <CurrentRoundNote>
          Showing Round {round.roundNumber}: {formatUtcMonthRange(round.startDate, round.endDate)}.
          {currentRoundNote ? ` ${currentRoundNote}` : ''}
        </CurrentRoundNote>
      ) : null}
    </HeaderContent>
  )
}

function mapTone(tone: StatusTone): ToneCalloutTone {
  return tone === 'error' ? 'danger' : tone
}

function AddressStatusPanel({
  status,
  roundPath,
}: {
  status: AddressLotteryStatus
  roundPath: string
}) {
  return (
    <ToneCallout
      tone={mapTone(status.tone)}
      title={status.title}
      body={status.body}
      metrics={status.metrics.map((m) => ({ label: m.label, value: m.value }))}
      action={{ to: roundPath, label: 'Open full round details' }}
    />
  )
}

function RoundAndBucketExplorer({
  round,
  rounds,
  searchParams,
  selectedBucketNumber,
  activeAddress,
}: {
  round: RoundDetailResponse
  rounds: RoundSummary[]
  searchParams: URLSearchParams
  selectedBucketNumber: number | null
  activeAddress: string
}) {
  const selectedBucket = getSelectedBucket(round.lottery, selectedBucketNumber, activeAddress)
  const userBucket = activeAddress ? findUserBucket(round.lottery, activeAddress) : null
  const orderedBuckets = round.lottery
    ? (userBucket
        ? [userBucket, ...round.lottery.buckets.filter((b) => b.bucketIndex !== userBucket.bucketIndex)]
        : round.lottery.buckets)
    : []

  return (
    <ExplorerGrid>
      <NavigatorPanel>
        <PanelHeader>
          <div>
            <PanelTitle>Choose lottery</PanelTitle>
          </div>
        </PanelHeader>

        <OptionGroup>
          <OptionLabel>Rounds</OptionLabel>
          {rounds.map((roundOption) => {
            const hasBuckets = (roundOption.lotteryBucketCount ?? 0) > 0
            return (
              <RoundOption
                key={roundOption.roundNumber}
                to={buildLotteryHref(searchParams, {
                  round: roundOption.roundNumber,
                  bucket: hasBuckets ? 1 : null,
                })}
                $active={roundOption.roundNumber === round.roundNumber}
              >
                <RoundOptionTop>
                  <RoundOptionTitle>Round {roundOption.roundNumber}</RoundOptionTitle>
                  <StatusBadge $status={roundOption.status}>{roundOption.status}</StatusBadge>
                </RoundOptionTop>
                <RoundOptionMeta>{formatUtcMonthRange(roundOption.startDate, roundOption.endDate)}</RoundOptionMeta>
                <RoundOptionMeta>{getRoundLotteryMeta(roundOption)}</RoundOptionMeta>
              </RoundOption>
            )
          })}
        </OptionGroup>

        <OptionGroup>
          <OptionLabel>Buckets in Round {round.roundNumber}</OptionLabel>
          {round.lottery && round.lottery.buckets.length > 0 ? (
            <BucketList>
              {orderedBuckets.map((bucket) => {
                const isUserBucket = userBucket?.bucketIndex === bucket.bucketIndex
                return (
                <BucketOption
                  key={bucket.bucketIndex}
                  to={buildLotteryHref(searchParams, {
                    round: round.roundNumber,
                    bucket: bucket.bucketIndex + 1,
                  })}
                  $active={selectedBucket?.bucketIndex === bucket.bucketIndex}
                >
                  <BucketOptionTitleRow>
                    <BucketOptionTitle>Bucket #{bucket.bucketIndex + 1}</BucketOptionTitle>
                    {isUserBucket && (
                      <YouPin aria-label="Your bucket">
                        <YouDot aria-hidden />
                        You
                      </YouPin>
                    )}
                  </BucketOptionTitleRow>
                  <BucketWinner>
                    <BucketOptionMeta>Winner</BucketOptionMeta>
                    <AddressIdentity
                      address={bucket.winner}
                      ensName={bucket.winnerEnsName}
                      resolveEns
                      secondaryAddress="never"
                    />
                  </BucketWinner>
                </BucketOption>
                )
              })}
            </BucketList>
          ) : (
            <PanelBody>
              Final buckets are not available for this round yet.
            </PanelBody>
          )}
        </OptionGroup>
      </NavigatorPanel>

      {selectedBucket && round.lottery ? (
        <SelectedBucketDetail
          round={round}
          bucket={selectedBucket}
          activeAddress={activeAddress}
        />
      ) : (
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>No finalized buckets for Round {round.roundNumber}</PanelTitle>
              <PanelBody>
                Buckets are available after the round is paid.
              </PanelBody>
            </div>
            <RoundPill>{round.distributionDataStatus.replace('_', ' ')}</RoundPill>
          </PanelHeader>
        </Panel>
      )}
    </ExplorerGrid>
  )
}

function SelectedBucketDetail({
  round,
  bucket,
  activeAddress,
}: {
  round: RoundDetailResponse
  bucket: LotteryBucketDetail
  activeAddress: string
}) {
  const rowRefs = useRef<Map<number, HTMLTableRowElement | null>>(new Map())

  const handleSlotClick = (entry: LotteryEntryDetail) => {
    const row = rowRefs.current.get(entry.entryIndex)
    if (!row) return
    row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    row.animate(
      [
        { backgroundColor: tokens.color.lightBlue },
        { backgroundColor: 'transparent' },
      ],
      { duration: 1200, easing: 'ease-out' },
    )
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Round {round.roundNumber} · Bucket #{bucket.bucketIndex + 1} details</PanelTitle>
          <PanelBody>
            Every participant below had a final payout under 1 ENS.
          </PanelBody>
        </div>
        <RoundPill>{formatEns(bucket.prizeEns, '0 ENS')} prize</RoundPill>
      </PanelHeader>

      <DetailGrid>
        <Stat>
          <StatValue>{formatEns(bucket.prizeEns, '0 ENS')}</StatValue>
          <StatLabel>Prize</StatLabel>
        </Stat>
        <Stat>
          <StatValue>
            <AddressIdentity
              address={bucket.winner}
              ensName={bucket.winnerEnsName}
              resolveEns
              secondaryAddress="never"
            />
          </StatValue>
          <StatLabel>Winner</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{getBucketParticipantCount(bucket).toLocaleString('en-US')}</StatValue>
          <StatLabel>Participants</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{formatProbability(bucket.winnerProbability)}</StatValue>
          <StatLabel>Winner's odds</StatLabel>
        </Stat>
      </DetailGrid>

      <ConditionGrid>
        <ConditionItem>
          <ConditionName>Entry</ConditionName>
          Final payout under 1 ENS.
        </ConditionItem>
        <ConditionItem>
          <ConditionName>Chance</ConditionName>
          ENS share divided by bucket prize.
        </ConditionItem>
        <ConditionItem>
          <ConditionName>Draw</ConditionName>
          RANDAO hash at round end.
        </ConditionItem>
      </ConditionGrid>

      <SlotGridSection>
        <SlotGridCaption>
          Each slot below is one entry. Width is proportional to that entry's ENS share — wider slots had higher odds. The winning slot is highlighted in green.
        </SlotGridCaption>
        <BucketSlotGrid
          entries={bucket.entries}
          winnerAddress={bucket.winner}
          highlightAddress={activeAddress}
          onSlotClick={handleSlotClick}
          ariaLabel={`Bucket ${bucket.bucketIndex + 1} entry distribution`}
        />
      </SlotGridSection>

      <SubsectionHeader>
        <div>
          <SubsectionTitle>Participants</SubsectionTitle>
        </div>
        <RoundPill>
          {bucket.entryCount.toLocaleString('en-US')} {bucket.entryCount === 1 ? 'entry' : 'entries'}
        </RoundPill>
      </SubsectionHeader>

      <TableWrap>
        <ParticipantTable>
          <colgroup>
            <col style={{ width: '36%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr>
              <Th>Participant</Th>
              <Th>ENS share</Th>
              <Th>Chance</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {bucket.entries.map((entry) => {
              const isWinner = sameAddress(entry.address, bucket.winner)
              const isActiveAddress = activeAddress ? sameAddress(entry.address, activeAddress) : false
              return (
                <Tr
                  key={`${bucket.bucketIndex}-${entry.entryIndex}`}
                  ref={(el) => { rowRefs.current.set(entry.entryIndex, el) }}
                  $highlight={isActiveAddress}
                  $winner={isWinner}
                >
                  <Td>
                    <AddressIdentity
                      address={entry.address}
                      ensName={entry.ensName}
                      resolveEns
                      secondaryAddress="auto"
                    />
                  </Td>
                  <Td>
                    <RewardValue>{formatEns(entry.amountEns, '0 ENS')}</RewardValue>
                  </Td>
                  <Td>
                    <OddsStack>
                      <span>{formatProbability(entry.probability)}</span>
                      <OddsMeter aria-hidden>
                        <OddsFill style={{ width: getOddsWidth(entry.probability) }} />
                      </OddsMeter>
                    </OddsStack>
                  </Td>
                  <Td>
                    <OutcomePill $winner={isWinner}>
                      {isWinner ? `Won ${formatEns(bucket.prizeEns, '0 ENS')}` : 'Not selected'}
                    </OutcomePill>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </ParticipantTable>
      </TableWrap>
    </Panel>
  )
}

export function LotteryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const walletState = useWalletState()
  const walletAddress = getWalletAddress(walletState)
  const searchedAddress = searchParams.get('address') ?? ''
  const activeAddress = searchedAddress || walletAddress
  const activeAddressValid = activeAddress ? isAddress(activeAddress) : false
  const selectedRoundNumber = parsePositiveInteger(searchParams.get('round')) ?? undefined
  const selectedBucketNumber = parsePositiveInteger(searchParams.get('bucket'))
  const [addressInput, setAddressInput] = useState(activeAddress)
  const [inputError, setInputError] = useState<string | null>(null)

  const { data, loading, error, execute } = useLottery(
    activeAddressValid ? activeAddress : undefined,
    selectedRoundNumber,
  )

  useEffect(() => {
    setAddressInput(activeAddress)
    setInputError(null)
  }, [activeAddress])

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

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('address', nextAddress)
      return next
    })
  }

  function handleAddressClear() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('address')
      return next
    })
    setAddressInput(walletAddress)
    setInputError(null)
  }

  const sourceLabel = searchedAddress
    ? 'Searched address'
    : walletAddress
      ? 'Connected wallet'
      : 'No address selected'
  const addressError = inputError || (activeAddress && !activeAddressValid ? 'Invalid address' : null)
  const currentRound = data?.rounds.find((round) => round.isCurrent)

  if (loading) {
    return <LotteryPageSkeleton />
  }

  if (error) {
    return (
      <Page>
        <HeaderBlock />
        <Content>
          <ErrorCard>
            <PanelTitle>Could not load lottery data</PanelTitle>
            <PanelBody>Something went wrong while fetching round results from the backend.</PanelBody>
            <Button colorStyle="redSecondary" size="medium" width="auto" onClick={execute}>
              Try again
            </Button>
          </ErrorCard>
        </Content>
      </Page>
    )
  }

  if (!data) {
    return (
      <Page>
        <HeaderBlock />
        <Content>
          <EmptyState>
            No rounds are configured yet. Lottery buckets will appear after a round produces final distribution data.
          </EmptyState>
        </Content>
      </Page>
    )
  }

  const { round } = data
  const addressStatus = buildAddressStatus(round, activeAddress, activeAddressValid)
  const roundPath = buildRoundPath(round, activeAddress, activeAddressValid)

  return (
    <Page>
      <HeaderBlock round={round} currentRound={currentRound} />

      <Content>
        <TopGrid>
          <AddressStatusPanel status={addressStatus} roundPath={roundPath} />
          <AddressPanel>
            <PanelHeader>
              <div>
                <PanelTitle>Inspect address</PanelTitle>
                <PanelBody>
                  Check any wallet against this round.
                </PanelBody>
              </div>
            </PanelHeader>
            <AddressLookupForm
              value={addressInput}
              activeAddress={activeAddress}
              sourceLabel={sourceLabel}
              error={addressError}
              onChange={setAddressInput}
              onSubmit={handleAddressSubmit}
              onClear={handleAddressClear}
            />
          </AddressPanel>
        </TopGrid>

        <RoundAndBucketExplorer
          round={round}
          rounds={data.rounds}
          searchParams={searchParams}
          selectedBucketNumber={selectedBucketNumber}
          activeAddress={activeAddress}
        />
      </Content>
    </Page>
  )
}
