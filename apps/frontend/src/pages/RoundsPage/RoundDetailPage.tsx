import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { isAddress } from 'viem'
import { api, ApiClientError } from '@/api'
import type {
  AddressRoundReward,
  LotteryBucketDetail,
  LotteryDetail,
  LotteryEntryDetail,
  RewardRank,
  RewardStatus,
  RoundStatus,
} from '@/api/types'
import { useAsync } from '@/hooks/useAsync'
import { useWalletState } from '@/features/wallet/useWalletState'
import { tokens, fadeInUp, Eyebrow, PageTitle, LoadingWrapper, ErrorMessage } from '@/styles'
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
  letter-spacing: 0.08em;
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
  letter-spacing: 0.08em;
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
      letter-spacing: 0.08em;
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
  letter-spacing: 0.08em;
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
  if (status === 'no_reward') return 'No reward'
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
                <AddressText>{bucket.winnerEnsName ?? truncateAddress(bucket.winner)}</AddressText>
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

function LotteryEntryTable({ entries }: { entries: LotteryEntryDetail[] }) {
  if (entries.length === 0) {
    return <EmptyState>No lottery entries.</EmptyState>
  }

  return (
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
                <AddressText>{entry.ensName ?? truncateAddress(entry.address)}</AddressText>
              </Td>
              <Td data-label="Amount">{formatEns(entry.amountEns, '0 ENS')}</Td>
              <Td data-label="Chance">{formatProbability(entry.probability)}</Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </WideTableWrap>
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
          rewardLimit: 'all',
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
    return (
      <Page>
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      </Page>
    )
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
        <SummaryItem>
          <SummaryLabel>Address Status</SummaryLabel>
          <SummaryValue>
            {round.data.addressReward
              ? statusLabel(round.data.addressReward.rewardStatus)
              : 'No address'}
          </SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Active Delegates</SummaryLabel>
          <SummaryValue>{round.data.activeDelegateCount ?? 'Unavailable'}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Direct Payout Holders</SummaryLabel>
          <SummaryValue>{round.data.eligibleDelegatorCount ?? 'Unavailable'}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Lottery Entries</SummaryLabel>
          <SummaryValue>{formatCount(round.data.lotteryEntryCount)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Lottery Winners</SummaryLabel>
          <SummaryValue>{formatCount(round.data.lotteryWinnerCount)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>Lottery Prize</SummaryLabel>
          <SummaryValue>{formatEns(round.data.lotteryPrizeEns, round.data.status === 'live' ? 'Pending' : 'Unavailable')}</SummaryValue>
        </SummaryItem>
      </SummaryGrid>

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
                <MetaLabel>Bucket Target</MetaLabel>
                <MetaValue>{formatEns(round.data.lottery.bucketTargetEns, '0 ENS')}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaLabel>Participants</MetaLabel>
                <MetaValue>{round.data.lottery.participantCount.toLocaleString('en-US')}</MetaValue>
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
          <RowCount>{lotteryEntryCountLabel(round.data.lottery)}</RowCount>
        </WideSectionHeader>
        <LotteryEntryTable entries={lotteryEntries} />
      </Section>

      <Section>
        <SectionHeader>
          <Eyebrow>Delegate Rewards</Eyebrow>
          <RowCount>{rewardCountLabel(round.data.topDelegateRewards.length)}</RowCount>
        </SectionHeader>
        <RankingTable rows={round.data.topDelegateRewards} />
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
