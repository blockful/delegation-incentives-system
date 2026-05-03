import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens, Eyebrow } from '@/styles'
import type { RoundStatus } from '@/api/types'

export interface RoundHistoryEntry {
  roundNumber: number
  dates: string
  pool: string
  tier: string
  distributed: string
  status: RoundStatus
  to: string
}

interface RoundHistoryTableProps {
  entries: RoundHistoryEntry[]
}

const Container = styled.section`
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

const RoundLink = styled(Link)`
  color: ${tokens.color.blue};
  font-weight: ${tokens.font.weight.bold};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`

const ValueText = styled.span`
  white-space: nowrap;
`

const MutedValue = styled.span`
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

const EmptyState = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
`

const StatusPill = styled.span<{ $status: RoundStatus }>`
  display: inline-flex;
  justify-self: start;
  align-items: center;
  white-space: nowrap;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  padding: 3px 10px;
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

function statusLabel(status: RoundStatus): string {
  if (status === 'live') return 'Live'
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  return 'Ended'
}

function renderValue(value: string) {
  if (value === 'Unavailable' || value === 'Pending') {
    return <MutedValue>{value}</MutedValue>
  }

  return <ValueText>{value}</ValueText>
}

export function RoundHistoryTable({ entries }: RoundHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <Container>
        <Eyebrow>Round History</Eyebrow>
        <EmptyState>No rounds configured.</EmptyState>
      </Container>
    )
  }

  return (
    <Container>
      <Eyebrow>Round History</Eyebrow>
      <Table>
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '23%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <Thead>
          <tr>
            <Th>Round</Th>
            <Th>Dates</Th>
            <Th>Pool</Th>
            <Th>Tier</Th>
            <Th>Distributed</Th>
            <Th>Status</Th>
          </tr>
        </Thead>
        <Tbody>
          {entries.map((entry) => (
            <Row key={entry.roundNumber}>
              <Td data-label="Round">
                <RoundLink to={entry.to}>Round {entry.roundNumber}</RoundLink>
              </Td>
              <Td data-label="Dates">{entry.dates}</Td>
              <Td data-label="Pool">{renderValue(entry.pool)}</Td>
              <Td data-label="Tier">{renderValue(entry.tier)}</Td>
              <Td data-label="Distributed">{renderValue(entry.distributed)}</Td>
              <Td data-label="Status">
                <StatusPill $status={entry.status}>{statusLabel(entry.status)}</StatusPill>
              </Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </Container>
  )
}
