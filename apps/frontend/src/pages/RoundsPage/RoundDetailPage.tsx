import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Spinner } from '@ensdomains/thorin'
import { isAddress } from 'viem'
import { api, ApiClientError } from '@/api'
import type { AddressRoundReward, RewardRank, RewardStatus, RoundStatus } from '@/api/types'
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  @media (max-width: 720px) {
    display: block;
  }
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

function formatAddressReward(reward: AddressRoundReward | null): string {
  if (!reward) return 'No address'
  if (reward.rewardStatus === 'pending') return 'Pending'
  if (reward.rewardStatus === 'unavailable') return 'Unavailable'
  return formatEns(reward.totalRewardEns, '0 ENS')
}

function formatRankRole(rank: RewardRank): string {
  return rank.role === 'delegate' ? 'Delegate' : 'Token holder'
}

function formatRankMeta(rank: RewardRank): string {
  if (rank.votingPower) return `${formatEns(rank.votingPower, '0 ENS', 0)} VP`
  if (rank.delegationCount != null) return `${rank.delegationCount} delegations`
  if (rank.source === 'lottery') return 'Lottery'
  if (rank.source === 'combined') return 'Direct + lottery'
  return 'Direct'
}

function RankingTable({ rows }: { rows: RewardRank[] }) {
  if (rows.length === 0) {
    return <EmptyState>No distribution data.</EmptyState>
  }

  return (
    <Table>
      <colgroup>
        <col style={{ width: '10%' }} />
        <col style={{ width: '34%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <Thead>
        <tr>
          <Th>Rank</Th>
          <Th>Address</Th>
          <Th>Type</Th>
          <Th>Reward</Th>
          <Th>Metadata</Th>
        </tr>
      </Thead>
      <Tbody>
        {rows.map((rank) => (
          <Row key={`${rank.role}-${rank.rank}-${rank.address}`}>
            <Td data-label="Rank">#{rank.rank}</Td>
            <Td data-label="Address">
              <AddressText>{rank.ensName ?? truncateAddress(rank.address)}</AddressText>
            </Td>
            <Td data-label="Type">{formatRankRole(rank)}</Td>
            <Td data-label="Reward">
              <RewardValue>{formatEns(rank.rewardEns)}</RewardValue>
            </Td>
            <Td data-label="Metadata">{formatRankMeta(rank)}</Td>
          </Row>
        ))}
      </Tbody>
    </Table>
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
        return await api.round(roundNumber, activeAddressValid ? activeAddress : undefined)
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
        <BackLink to={backTo}>Back to rounds</BackLink>
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
          <SummaryLabel>Eligible Holders</SummaryLabel>
          <SummaryValue>{round.data.eligibleDelegatorCount ?? 'Unavailable'}</SummaryValue>
        </SummaryItem>
      </SummaryGrid>

      <Section>
        <Eyebrow>Top Delegate Rewards</Eyebrow>
        <RankingTable rows={round.data.topDelegateRewards} />
      </Section>

      <Section>
        <Eyebrow>Top Token Holder Rewards</Eyebrow>
        <RankingTable rows={round.data.topTokenHolderRewards} />
      </Section>
    </Page>
  )
}
