import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LotteryStatusCardProps {
  qualifies: boolean
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
  transition:
    border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};
  background: ${tokens.color.surface};

  &:hover {
    border-color: ${tokens.color.gray3};
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
  }
`

const IconCircle = styled.div<{ $active: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? tokens.color.lightYellow : tokens.color.surfaceAlt)};
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

const StatusBadge = styled.span<{ $active: boolean }>`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $active }) => ($active ? tokens.color.positive : tokens.color.textMuted)};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`

const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
  transition: transform ${tokens.transition.fast};
`

export function LotteryStatusCard({ qualifies }: LotteryStatusCardProps) {
  return (
    <CardLink to="/lottery">
      <IconCircle $active={qualifies}>
        {qualifies ? '🎟️' : '🎲'}
      </IconCircle>
      <Content>
        <Title>
          {qualifies ? 'You\'re in the lottery' : 'Lottery'}
        </Title>
        <Detail>
          {qualifies
            ? 'Your payout is below 1 ENS, so it enters a 10 ENS prize pool drawn at round end.'
            : 'Payouts below 1 ENS are pooled into a 10 ENS lottery prize. Learn how it works.'
          }
        </Detail>
      </Content>
      {qualifies && <StatusBadge $active>Eligible</StatusBadge>}
      <Chevron aria-hidden>&rsaquo;</Chevron>
    </CardLink>
  )
}
