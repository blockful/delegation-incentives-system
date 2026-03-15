import styled from 'styled-components'
import { Tag } from '@ensdomains/thorin'

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
  gap: 16px;
`

const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3889ff;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Td = styled.td`
  font-size: 14px;
  padding: 12px;
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
`

const EarnedValue = styled.span`
  color: #49b365;
  font-weight: 600;
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
