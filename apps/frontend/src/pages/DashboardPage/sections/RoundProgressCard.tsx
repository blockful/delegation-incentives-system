import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface RoundProgressCardProps {
  roundNumber: number
  percentComplete: number
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
  gap: 10px;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Percent = styled.span`
  font-size: 13px;
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.textMuted};
`

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.border};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.accent};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width ${tokens.transition.slow};
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
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
