import styled from 'styled-components'
import { TierDots } from '@/components/shared/TierDots'
import type { TierEntry } from '@/api/types'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3889ff;
`

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0;
  line-height: 1.5;
`

const TierList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TierRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'rgba(73, 179, 101, 0.12)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(73, 179, 101, 0.3)' : 'transparent')};
`

const TierInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const TierName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  min-width: 56px;
`

const PoolSize = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary};
`

const StatusIcon = styled.span<{ $unlocked: boolean }>`
  font-size: 16px;
  opacity: ${({ $unlocked }) => ($unlocked ? 1 : 0.4)};
`

function formatPool(ens: string): string {
  const num = Number(ens)
  return num >= 1000 ? `${num.toLocaleString('en-US')} ENS` : `${num} ENS`
}

export function TierTable({ tiers, currentTierIndex }: TierTableProps) {
  return (
    <Container>
      <Label>APY Tiers</Label>
      <Description>
        The reward pool grows as total voting power increases. Higher tiers
        unlock bigger pools with better APY.
      </Description>
      <TierList>
        {tiers.map((tier) => {
          const active = tier.index === currentTierIndex
          return (
            <TierRow
              key={tier.index}
              $active={active}
              data-testid="tier-row"
              data-active={active}
            >
              <TierInfo>
                <TierName>Tier #{tier.index + 1}</TierName>
                <TierDots tierIndex={tier.index} />
              </TierInfo>
              <PoolSize>{formatPool(tier.poolSizeEns)}</PoolSize>
              <StatusIcon $unlocked={tier.isUnlocked}>
                {tier.isUnlocked ? '✓' : '🔒'}
              </StatusIcon>
            </TierRow>
          )
        })}
      </TierList>
    </Container>
  )
}
