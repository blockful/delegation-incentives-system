import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'
import { formatEnsAmount } from '@/utils/format'
import type { AddressDistributionRound } from '@/api/types'

interface PastRoundsStripProps {
  rounds: AddressDistributionRound[]
  address: string
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
`

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: ${tokens.spacing.md};
`

const Eyebrow = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.06em;
  color: ${tokens.color.darkGray};
`

const Title = styled.h2`
  margin: 4px 0 0;
  font-size: ${tokens.font.size.xl};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const ViewAll = styled(Link)`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Strip = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const Card = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${tokens.spacing.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  text-decoration: none;
  transition: all ${tokens.transition.fast};
  overflow: hidden;
  min-width: 0;

  &::after {
    content: '→';
    position: absolute;
    top: ${tokens.spacing.lg};
    right: ${tokens.spacing.lg};
    color: ${tokens.color.darkGray};
    font-size: ${tokens.font.size.xl};
    transition: transform ${tokens.transition.fast};
  }

  &:hover {
    border-color: ${tokens.color.blue};
    transform: translateY(-1px);
    box-shadow: ${tokens.shadow.md};
  }

  &:hover::after {
    transform: translateX(2px);
    color: ${tokens.color.blue};
  }
`

const RoundLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  letter-spacing: 0.04em;
  color: ${tokens.color.darkGray};
`

const Amount = styled.span<{ $earned: boolean }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.black};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: ${({ $earned }) => $earned ? tokens.color.status.success.fg : tokens.color.darkGray};
`

const Sub = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
`

const StatusBadge = styled.span<{ $tone: 'success' | 'neutral' | 'pending' }>`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 2px 8px;
  margin-top: ${tokens.spacing.xs};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  background: ${({ $tone }) => tokens.color.status[$tone].bg};
  color: ${({ $tone }) => tokens.color.status[$tone].fg};
  border: 1px solid ${({ $tone }) => tokens.color.status[$tone].border};
  letter-spacing: 0.04em;
`

const EmptyCard = styled.div`
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  background: ${tokens.color.surface};
  border: 1px dashed ${tokens.color.borderLight};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  text-align: center;
  line-height: 1.6;
`

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const date = new Date(Date.UTC(y, m - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function statusToTone(status: AddressDistributionRound['rewardStatus']): 'success' | 'neutral' | 'pending' {
  if (status === 'paid') return 'success'
  if (status === 'pending') return 'pending'
  return 'neutral'
}

function statusLabel(status: AddressDistributionRound['rewardStatus']): string {
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending'
  if (status === 'no_reward') return 'No payout'
  if (status === 'not_eligible') return 'Not eligible'
  return 'Unavailable'
}

export function PastRoundsStrip({ rounds, address }: PastRoundsStripProps) {
  const paidRounds = rounds
    .filter((r) => r.roundStatus !== 'live')
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .slice(0, 3)

  return (
    <Section>
      <SectionHeader>
        <div>
          <Eyebrow>Your Round History</Eyebrow>
          <Title>Recent payouts</Title>
        </div>
        <ViewAll to={`/rounds?address=${address}`}>View all rounds →</ViewAll>
      </SectionHeader>

      {paidRounds.length === 0 ? (
        <EmptyCard>
          No finalized rounds yet. Your first payout appears here once a round closes.
        </EmptyCard>
      ) : (
        <Strip>
          {paidRounds.map((r) => {
            const amount = Number(r.totalRewardEns)
            const earned = Number.isFinite(amount) && amount > 0
            const tone = statusToTone(r.rewardStatus)
            return (
              <Card key={r.roundNumber} to={`/rounds/${r.roundNumber}?address=${address}`}>
                <RoundLabel>Round {r.roundNumber}</RoundLabel>
                <Amount $earned={earned}>
                  {earned ? `+${formatEnsAmount(r.totalRewardEns, { maximumFractionDigits: 2 })}` : '0.00'} ENS
                </Amount>
                <Sub>{formatMonthLabel(r.month)}</Sub>
                <StatusBadge $tone={tone}>{statusLabel(r.rewardStatus)}</StatusBadge>
              </Card>
            )
          })}
        </Strip>
      )}
    </Section>
  )
}
