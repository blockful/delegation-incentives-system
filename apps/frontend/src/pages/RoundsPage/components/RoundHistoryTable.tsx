import styled from 'styled-components'
import { Tag } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'

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

const Label = styled.span`
  font-size: 13px;
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.accent};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.textMuted};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-bottom: 1px solid ${tokens.color.border};
`

const Td = styled.td`
  font-size: ${tokens.font.size.base};
  padding: ${tokens.spacing.md};
  color: ${tokens.color.text};
  border-bottom: 1px solid ${tokens.color.surfaceAlt};
`

const EarnedValue = styled.span`
  color: ${tokens.color.positive};
  font-weight: ${tokens.font.weight.semibold};
`

export function RoundHistoryTable({ entries }: RoundHistoryTableProps) {
  return (
    <Container>
      <Label>Round History</Label>
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
              <Td>{entry.dates}</Td>
              <Td>
                <EarnedValue>+{entry.earned} ENS</EarnedValue>
              </Td>
              <Td>
                <Tag
                  colorStyle={
                    entry.status === 'live' ? 'greenPrimary' : 'greyPrimary'
                  }
                >
                  {entry.status === 'live' ? 'Live' : 'Paid'}
                </Tag>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}
