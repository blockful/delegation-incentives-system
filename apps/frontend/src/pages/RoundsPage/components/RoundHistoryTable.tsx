import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens, Eyebrow } from '@/styles'

export interface RoundHistoryEntry {
  roundNumber: number
  dates: string
  pool: string
  vpGrowth: string
  lottery: string
  yourRewards: string
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
  overflow-wrap: anywhere;
`

const MutedValue = styled.span`
  color: ${tokens.color.darkGray};
  white-space: nowrap;
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

function renderValue(value: string) {
  if (value === 'Unavailable' || value === 'Pending' || value === 'No address' || value === 'Loading') {
    return <MutedValue>{value}</MutedValue>
  }

  if (value.startsWith('+')) {
    return <RewardValue>{value}</RewardValue>
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
          <col style={{ width: '16%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <Thead>
          <tr>
            <Th>Round</Th>
            <Th>Dates</Th>
            <Th>Pool</Th>
            <Th>VP growth</Th>
            <Th>Lottery</Th>
            <Th>Your rewards</Th>
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
              <Td data-label="VP growth">{renderValue(entry.vpGrowth)}</Td>
              <Td data-label="Lottery">{renderValue(entry.lottery)}</Td>
              <Td data-label="Your rewards">{renderValue(entry.yourRewards)}</Td>
            </Row>
          ))}
        </Tbody>
      </Table>
    </Container>
  )
}
