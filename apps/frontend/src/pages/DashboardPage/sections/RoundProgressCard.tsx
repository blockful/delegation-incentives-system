import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface RoundProgressCardProps {
  roundNumber: number
  percentComplete: number
}

const CardLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid #E5E5E5;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fff;

  &:hover {
    border-color: #C4C7C8;
    box-shadow: 0 2px 8px rgba(1, 26, 37, 0.04);
  }
`

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #011A25;
`

const Percent = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #4A5C63;
`

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: 2px;
  background: #E5E5E5;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: #0080BC;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.3s ease;
`

const Chevron = styled.span`
  font-size: 18px;
  color: #C4C7C8;
`

export function RoundProgressCard({
  roundNumber,
  percentComplete,
}: RoundProgressCardProps) {
  return (
    <CardLink to="/rounds">
      <Content>
        <TopRow>
          <Title>Round {roundNumber}</Title>
          <Percent>{percentComplete}%</Percent>
        </TopRow>
        <ProgressTrack>
          <ProgressFill $pct={percentComplete} />
        </ProgressTrack>
      </Content>
      <Chevron aria-hidden>&rsaquo;</Chevron>
    </CardLink>
  )
}
