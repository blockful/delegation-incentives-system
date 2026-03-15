import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Card } from '@ensdomains/thorin'

interface LotteryStatusCardProps {
  poolNumber: number
  accumulated: string
  odds: string
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
  gap: 4px;
`

const Title = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

const Detail = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const Chevron = styled.span`
  font-size: 18px;
  color: ${({ theme }) => theme.colors.textTertiary};
`

export function LotteryStatusCard({
  poolNumber,
  accumulated,
  odds,
}: LotteryStatusCardProps) {
  return (
    <CardLink as={Link} to="/lottery">
      <Content>
        <Title>Lottery Pool #{poolNumber}</Title>
        <Detail>
          {accumulated} ENS accumulated · {odds} odds
        </Detail>
      </Content>
      <Chevron aria-hidden>›</Chevron>
    </CardLink>
  )
}
