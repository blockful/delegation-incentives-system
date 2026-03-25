import styled from 'styled-components'
import { tokens, Eyebrow } from '@/styles'

export interface RoundHistoryEntry {
  round: number
  dates: string
  earned: string
  status: 'live' | 'paid'
}

interface RoundHistoryTableProps {
  entries: RoundHistoryEntry[]
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.darkGray};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-bottom: 1px solid ${tokens.color.borderLight};
`

const Td = styled.td`
  font-size: ${tokens.font.size.base};
  padding: ${tokens.spacing.md};
  color: ${tokens.color.darkBlue};
  border-bottom: 1px solid ${tokens.color.borderLight};
  white-space: nowrap;
`

const EarnedValue = styled.span`
  color: ${tokens.color.positiveEmphasis};
  font-weight: ${tokens.font.weight.semibold};
`

const StatusPill = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  padding: 3px 10px;
  border-radius: ${tokens.radius.pill};
  background: ${({ $live }) =>
    $live ? tokens.color.lightBlueOpacity : tokens.color.borderLight};
  color: ${({ $live }) =>
    $live ? tokens.color.blue : tokens.color.darkGray};
`

/**
 * Compress date ranges that share the same month.
 * "Mar 1 – Mar 31" → "Mar 1–31"
 * Cross-month ranges are returned unchanged.
 */
function compactDateRange(raw: string): string {
  const m = raw.match(
    /^([A-Z][a-z]+)\s+(\d+)\s*[–—-]\s*([A-Z][a-z]+)\s+(\d+)$/,
  )
  if (!m) return raw
  const [, startMonth, startDay, endMonth, endDay] = m
  if (startMonth === endMonth) return `${startMonth} ${startDay}–${endDay}`
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`
}

export function RoundHistoryTable({ entries }: RoundHistoryTableProps) {
  return (
    <Container>
      <Eyebrow>Round History</Eyebrow>
      <Table>
        <thead>
          <tr>
            <Th>Round</Th>
            <Th>Dates</Th>
            <Th>Earned</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.round}>
              <Td>Round {entry.round}</Td>
              <Td>{compactDateRange(entry.dates)}</Td>
              <Td>
                <EarnedValue>+{entry.earned} ENS</EarnedValue>
              </Td>
              <Td>
                <StatusPill $live={entry.status === 'live'}>
                  {entry.status === 'live' ? 'Live' : 'Paid'}
                </StatusPill>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}
