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
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  text-decoration: none;
  box-shadow: ${tokens.shadow.sm};
  transition: box-shadow ${tokens.transition.fast};

  &:hover {
    box-shadow: ${tokens.shadow.md};
  }
`

const CardBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const CardLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0;
  color: ${tokens.color.darkGray};
`

const CardTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const Track = styled.div`
  height: 4px;
  border-radius: 2px;
  background: ${tokens.color.borderLight};
  overflow: hidden;
`

const Fill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 2px;
  background: ${tokens.color.blue};
  width: ${({ $pct }) => Math.min(Math.max($pct, 1), 100)}%;
  transition: width 0.6s ease;
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.darkGray};
  flex-shrink: 0;
`

export function RoundProgressCard({ roundNumber, percentComplete }: RoundProgressCardProps) {
  return (
    <CardLink to="/rounds">
      <CardBody>
        <CardLabel>Round Progress</CardLabel>
        <CardTitle>Round {roundNumber} · {Math.round(percentComplete)}% complete</CardTitle>
        <Track>
          <Fill $pct={percentComplete} />
        </Track>
      </CardBody>
      <Chevron>›</Chevron>
    </CardLink>
  )
}
