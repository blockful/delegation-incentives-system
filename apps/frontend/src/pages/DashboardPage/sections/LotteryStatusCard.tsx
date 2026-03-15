import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LotteryStatusCardProps {
  expectedPayout: string
}

const CardLink = styled(Link)`
  display: flex;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.xl};
  border: 1px solid ${tokens.color.lightYellow};
  border-radius: ${tokens.radius.lg};
  text-decoration: none;
  color: inherit;
  background: linear-gradient(135deg, rgba(255, 247, 47, 0.04) 0%, ${tokens.color.surface} 100%);
  transition:
    border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};

  &:hover {
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
  }
`

const IconCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${tokens.color.lightYellow};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Title = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

const Detail = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
  line-height: 1.4;
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
  align-self: center;
  transition: transform ${tokens.transition.fast};
`

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  return num.toFixed(4)
}

export function LotteryStatusCard({ expectedPayout }: LotteryStatusCardProps) {
  return (
    <CardLink to="/lottery">
      <IconCircle aria-hidden>🎟️</IconCircle>
      <Content>
        <Title>Your {formatPayout(expectedPayout)} ENS enters the lottery</Title>
        <Detail>
          Payouts below 1 ENS are pooled into a 10 ENS prize, drawn at round end. Learn more &rarr;
        </Detail>
      </Content>
      <Chevron aria-hidden>&rsaquo;</Chevron>
    </CardLink>
  )
}
