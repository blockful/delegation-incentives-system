import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LotteryCardProps {
  expectedPayout: string
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
  gap: ${tokens.spacing.xs};
`

const CardLabel = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.color.darkGray};
`

const CardTitle = styled.span`
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
`

const CardSub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.darkGray};
  flex-shrink: 0;
`

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  return num.toFixed(4)
}

export function LotteryCard({ expectedPayout }: LotteryCardProps) {
  const payout = parseFloat(expectedPayout)
  const poolAccumulated = (payout * 10).toFixed(1)

  return (
    <CardLink to="/lottery">
      <CardBody>
        <CardLabel>Lottery</CardLabel>
        <CardTitle>You're entered in the lottery</CardTitle>
        <CardSub>
          {poolAccumulated} / 10 ENS accumulated · {formatPayout(expectedPayout)} ENS payout
        </CardSub>
      </CardBody>
      <Chevron>›</Chevron>
    </CardLink>
  )
}
