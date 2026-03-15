import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface LotteryStatusCardProps {
  poolNumber: number
  accumulated: string
  odds: string
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
  gap: 4px;
`

const Title = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #011A25;
`

const Detail = styled.span`
  font-size: 13px;
  color: #4A5C63;
`

const Chevron = styled.span`
  font-size: 18px;
  color: #C4C7C8;
`

export function LotteryStatusCard({
  poolNumber,
  accumulated,
  odds,
}: LotteryStatusCardProps) {
  return (
    <CardLink to="/lottery">
      <Content>
        <Title>Lottery Pool #{poolNumber}</Title>
        <Detail>
          {accumulated} ENS accumulated &middot; {odds} odds
        </Detail>
      </Content>
      <Chevron aria-hidden>&rsaquo;</Chevron>
    </CardLink>
  )
}
