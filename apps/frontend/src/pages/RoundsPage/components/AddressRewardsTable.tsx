import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens, Eyebrow } from '@/styles'
import type { AddressDistributionRound, RewardStatus } from '@/api/types'
import { formatEnsAmount, formatUtcMonthRange } from '@/utils/format'

interface AddressRewardsTableProps {
  address: string
  rounds: AddressDistributionRound[] | null
  loading: boolean
  error: string | null
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
`

const Header = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: ${tokens.spacing.md};
  flex-wrap: wrap;
`

const AddressText = styled.span`
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.sm};
  overflow-wrap: anywhere;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  @media (max-width: 640px) {
    display: block;
  }
`

const Thead = styled.thead`
  @media (max-width: 640px) {
    display: none;
  }
`

const Tbody = styled.tbody`
  @media (max-width: 640px) {
    display: grid;
    gap: ${tokens.spacing.sm};
  }
`

const Row = styled.tr`
  @media (max-width: 640px) {
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

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: minmax(82px, 36%) minmax(0, 1fr);
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

const RoundLink = styled(Link)`
  color: ${tokens.color.blue};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`

const RewardValue = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.bold};
  white-space: nowrap;
`

const Muted = styled.span`
  color: ${tokens.color.darkGray};
`

const EmptyState = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
`

const StatusPill = styled.span<{ $status: RewardStatus }>`
  display: inline-flex;
  justify-self: start;
  align-items: center;
  white-space: nowrap;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${({ $status }) =>
    $status === 'paid' ? tokens.color.tierHighlight : tokens.color.borderLight};
  color: ${({ $status }) =>
    $status === 'paid' ? tokens.color.positiveEmphasis : tokens.color.darkGray};
`

function rewardStatusLabel(status: RewardStatus): string {
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  if (status === 'not_eligible') return 'Not eligible'
  if (status === 'no_reward') return 'No reward'
  return 'Unavailable'
}

function rewardDisplay(round: AddressDistributionRound) {
  if (round.rewardStatus === 'pending') return <Muted>Pending</Muted>
  if (round.rewardStatus === 'unavailable') return <Muted>Unavailable</Muted>
  if (round.rewardStatus === 'not_eligible') return <Muted>0 ENS</Muted>
  if (round.rewardStatus === 'no_reward') return <Muted>0 ENS</Muted>

  const amount = formatEnsAmount(round.totalRewardEns, {
    maximumFractionDigits: 4,
    signDisplay: 'exceptZero',
  })
  return <RewardValue>{amount} ENS</RewardValue>
}

export function AddressRewardsTable({
  address,
  rounds,
  loading,
  error,
}: AddressRewardsTableProps) {
  if (!address) {
    return (
      <Container>
        <Eyebrow>Address Rewards</Eyebrow>
        <EmptyState>Enter an address to inspect rewards.</EmptyState>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container>
        <Eyebrow>Address Rewards</Eyebrow>
        <EmptyState>Loading rewards.</EmptyState>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Eyebrow>Address Rewards</Eyebrow>
        <EmptyState>Rewards unavailable.</EmptyState>
      </Container>
    )
  }

  if (!rounds || rounds.length === 0) {
    return (
      <Container>
        <Header>
          <Eyebrow>Address Rewards</Eyebrow>
          <AddressText>{address}</AddressText>
        </Header>
        <EmptyState>No reward history.</EmptyState>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Eyebrow>Address Rewards</Eyebrow>
        <AddressText>{address}</AddressText>
      </Header>
      <Table>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <Thead>
          <tr>
            <Th>Round</Th>
            <Th>Dates</Th>
            <Th>Earned</Th>
            <Th>Status</Th>
          </tr>
        </Thead>
        <Tbody>
          {(rounds ?? []).map((round) => (
            <Row key={round.roundNumber}>
              <Td data-label="Round">
                <RoundLink to={`/rounds/${round.roundNumber}?address=${encodeURIComponent(address)}`}>
                  Round {round.roundNumber}
                </RoundLink>
              </Td>
              <Td data-label="Dates">{formatUtcMonthRange(round.startDate, round.endDate)}</Td>
              <Td data-label="Earned">{rewardDisplay(round)}</Td>
              <Td data-label="Status">
                <StatusPill $status={round.rewardStatus}>
                  {rewardStatusLabel(round.rewardStatus)}
                </StatusPill>
              </Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </Container>
  )
}
