import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LotteryStatusCardProps {
  poolNumber: number
  accumulated: string
  odds: string
}

const CardLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.xl};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  text-decoration: none;
  color: inherit;
  transition: border-color ${tokens.transition.fast}, box-shadow ${tokens.transition.fast};
  background: ${tokens.color.surface};

  &:hover {
    border-color: ${tokens.color.textFaint};
    box-shadow: ${tokens.shadow.sm};
  }
`

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const Title = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Detail = styled.span`
  font-size: 13px;
  color: ${tokens.color.textMuted};
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
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
