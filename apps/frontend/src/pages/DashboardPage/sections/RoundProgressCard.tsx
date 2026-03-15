import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Card } from '@ensdomains/thorin'

interface RoundProgressCardProps {
  roundNumber: number
  percentComplete: number
}

const CardLink = styled(Card)`
  display: flex;
  align-items: center;
  gap: 16px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.textTertiary};
  }
`

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Title = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const ProgressTrack = styled.div`
  height: 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  background: #007C23;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.3s ease;
`

const Chevron = styled.span`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

export function RoundProgressCard({
  roundNumber,
  percentComplete,
}: RoundProgressCardProps) {
  return (
    <CardLink as={Link} to="/rounds">
      <Content>
        <Title>Round {roundNumber}</Title>
        <ProgressTrack>
          <ProgressFill $pct={percentComplete} />
        </ProgressTrack>
      </Content>
      <Chevron aria-hidden>›</Chevron>
    </CardLink>
  )
}
