import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

interface LotteryBannerProps {
  expectedPayout: string
}

const Banner = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing.lg} ${tokens.spacing.xl};
  border: 1px solid ${tokens.color.lightYellow};
  border-radius: ${tokens.radius.lg};
  background: linear-gradient(135deg, rgba(255, 247, 47, 0.05) 0%, ${tokens.color.surface} 100%);
  text-decoration: none;
  color: inherit;
  transition:
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};

  &:hover {
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
  }
`

const Icon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`

const Text = styled.span`
  flex: 1;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.text};
  line-height: 1.4;

  strong {
    font-weight: ${tokens.font.weight.semibold};
  }
`

const Arrow = styled.span`
  font-size: ${tokens.font.size.lg};
  color: ${tokens.color.textFaint};
`

function formatPayout(ens: string): string {
  const num = parseFloat(ens)
  if (isNaN(num) || num === 0) return '0'
  return num.toFixed(4)
}

export function LotteryBanner({ expectedPayout }: LotteryBannerProps) {
  return (
    <Banner to="/lottery">
      <Icon aria-hidden>🎟️</Icon>
      <Text>
        Your <strong>{formatPayout(expectedPayout)} ENS</strong> payout is below the 1 ENS minimum.
        It enters a <strong>10 ENS lottery pool</strong> drawn at round end.
      </Text>
      <Arrow aria-hidden>&rsaquo;</Arrow>
    </Banner>
  )
}
