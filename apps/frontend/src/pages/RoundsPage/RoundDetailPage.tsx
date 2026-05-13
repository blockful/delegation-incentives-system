import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
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

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.spacing.md};

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const SummaryLabel = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
`

const SummaryValue = styled.span`
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  overflow-wrap: anywhere;
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

const Row = styled.tr`
  @media (max-width: 720px) {
    display: grid;
    border: 1px solid ${tokens.color.borderLight};
    border-radius: ${tokens.radius.sm};
    overflow: hidden;
  }
`

const Th = styled.th`
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  text-align: left;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkGray};
  text-transform: uppercase;
  letter-spacing: 0;
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
      font-weight: ${tokens.font.weight.bold};
      text-transform: uppercase;
      letter-spacing: 0;
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
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0;
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

const AddressLotteryPanel = styled.section<{ $tone: 'neutral' | 'success' | 'warning' | 'pending' | 'error' }>`
  width: 100%;
  max-width: 840px;
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.positiveEmphasis
    if ($tone === 'warning') return tokens.color.orange
    if ($tone === 'pending') return tokens.color.blue
    if ($tone === 'error') return tokens.color.negative
    return tokens.color.borderLight
  }};
  border-radius: ${tokens.radius.sm};
  background: ${({ $tone }) => {
    if ($tone === 'success') return tokens.color.tierHighlight
    if ($tone === 'warning') return tokens.color.lightOrange
    if ($tone === 'pending') return tokens.color.lightBlue
    if ($tone === 'error') return '#FEE9F0'
    return tokens.color.surface
  }};
  padding: ${tokens.spacing['2xl']};
  display: grid;
  gap: ${tokens.spacing.lg};
`

const AddressLotteryTitle = styled.h2`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
`

const AddressLotteryBody = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.6;
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

function formatVpGrowth(value: string | null): string {
  if (value == null) return 'Unavailable'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'Unavailable'
  if (numericValue > 0) return `+${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
  return `${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
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

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

interface AddressLotteryEntry {
  bucket: LotteryBucketDetail
  entry: LotteryEntryDetail
  won: boolean
}

interface AddressLotteryInsight {
  tone: 'neutral' | 'success' | 'warning' | 'pending' | 'error'
  title: string
  body: string
  metrics: Array<{ label: string; value: string }>
}

const LOTTERY_ENTRY_DISPLAY_LIMIT = 100

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
      tone: 'error',
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

function RankingTable({ rows }: { rows: RewardRank[] }) {
  if (rows.length === 0) {
    return <EmptyState>No distribution data.</EmptyState>
  }

  return (
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
          {rows.map((rank) => (
            <Row key={`${rank.role}-${rank.rank}-${rank.address}`}>
              <Td data-label="Rank">#{rank.rank}</Td>
              <Td data-label="Address">
                <AddressText>{rank.ensName ?? truncateAddress(rank.address)}</AddressText>
              </Td>
              <Td data-label="Reward">
                <RewardValue>{formatEns(rank.rewardEns)}</RewardValue>
              </Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
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
    <AddressLotteryPanel $tone={insight.tone}>
      <AddressLotteryTitle>{insight.title}</AddressLotteryTitle>
      <AddressLotteryBody>{insight.body}</AddressLotteryBody>
      {activeAddress && activeAddressValid ? (
        <MetaItem>
          <MetaLabel>Selected Address</MetaLabel>
          <MetaValue>
            <CopyableAddress address={activeAddress} resolveEns={false} showEnsName />
          </MetaValue>
        </MetaItem>
      ) : null}
      <MetaGrid>
        {insight.metrics.map((metric) => (
          <MetaItem key={metric.label}>
            <MetaLabel>{metric.label}</MetaLabel>
            <MetaValue>{metric.value}</MetaValue>
          </MetaItem>
        ))}
      </MetaGrid>
    </AddressLotteryPanel>
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

  return (
    <Page>
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
        <TitleRow>
          <div>
            <Eyebrow>Round Details</Eyebrow>
            <PageTitle>Round {round.data.roundNumber}</PageTitle>
          </div>
          <StatusPill $status={round.data.status}>{statusLabel(round.data.status)}</StatusPill>
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

      <SummaryGrid>
        <SummaryItem>
          <SummaryLabel>Dates</SummaryLabel>
          <SummaryValue>{formatUtcMonthRange(round.data.startDate, round.data.endDate)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Tier</SummaryLabel>
          <SummaryValue>{round.data.tierLabel ?? 'Unavailable'}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>VP Growth</SummaryLabel>
          <SummaryValue>{formatVpGrowth(round.data.vpGrowthPct)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Pool</SummaryLabel>
          <SummaryValue>{formatEns(round.data.poolSizeEns, 'Unavailable', 0)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Distributed</SummaryLabel>
          <SummaryValue>{formatEns(round.data.totalDistributedEns, round.data.status === 'live' ? 'Pending' : 'Unavailable')}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Address Earned</SummaryLabel>
          <SummaryValue>{formatAddressReward(round.data.addressReward)}</SummaryValue>
        </SummaryItem>
      </SummaryGrid>

      <Section>
        <WideSectionHeader>
          <Eyebrow>Address Lottery</Eyebrow>
          <RowCount>
            {activeAddressValid && activeAddress
              ? 'Address-specific'
              : 'No address'}
          </RowCount>
        </WideSectionHeader>
        <AddressLotteryInsightPanel
          round={round.data}
          activeAddress={activeAddress}
          activeAddressValid={activeAddressValid}
        />
      </Section>

      <Section>
        <WideSectionHeader>
          <Eyebrow>Lottery Results</Eyebrow>
          <RowCount>{lotteryBucketCountLabel(round.data.lottery)}</RowCount>
        </WideSectionHeader>
        {round.data.lottery ? (
          <>
            <MetaGrid>
              <MetaItem>
                <MetaLabel>Seed Source</MetaLabel>
                <MetaValue>{round.data.lottery.seed.label}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Seed Block</MetaLabel>
                <MetaValue>{formatBlockNumber(round.data.lottery.seed.blockNumber)}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Total Lottery Prizes</MetaLabel>
                <MetaValue>{formatEns(round.data.lotteryPrizeEns, '0 ENS')}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Participants</MetaLabel>
                <MetaValue>{round.data.lottery.participantCount.toLocaleString('en-US')}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Entries</MetaLabel>
                <MetaValue>{formatCount(round.data.lotteryEntryCount)}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Winners</MetaLabel>
                <MetaValue>{formatCount(round.data.lotteryWinnerCount)}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Bucket Target</MetaLabel>
                <MetaValue>{formatEns(round.data.lottery.bucketTargetEns, '0 ENS')}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Algorithm</MetaLabel>
                <MetaValue>{round.data.lottery.seed.algorithm}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Seed</MetaLabel>
                <MetaValue>{round.data.lottery.seed.value}</MetaValue>
              </MetaItem>
            </MetaGrid>
            <LotteryBucketTable buckets={round.data.lottery.buckets} />
          </>
        ) : (
          <EmptyState>No lottery data.</EmptyState>
        )}
      </Section>

      <Section>
        <WideSectionHeader>
          <Eyebrow>Lottery Entries</Eyebrow>
          <RowCount>
            {round.data.lottery
              ? visibleLotteryEntryCountLabel(lotteryEntries.length, visibleLotteryEntries.length)
              : lotteryEntryCountLabel(round.data.lottery)}
          </RowCount>
        </WideSectionHeader>
        <LotteryEntryTable entries={visibleLotteryEntries} totalCount={lotteryEntries.length} />
      </Section>

      <Section>
        <SectionHeader>
          <Eyebrow>Delegate Rewards</Eyebrow>
          <RowCount>{rewardCountLabel(round.data.topVoterRewards.length)}</RowCount>
        </SectionHeader>
        <RankingTable rows={round.data.topVoterRewards} />
      </Section>

      <Section>
        <SectionHeader>
          <Eyebrow>Token Holder Rewards</Eyebrow>
          <RowCount>{rewardCountLabel(round.data.topTokenHolderRewards.length)}</RowCount>
        </SectionHeader>
        <RankingTable rows={round.data.topTokenHolderRewards} />
      </Section>
    </Page>
  )
}
