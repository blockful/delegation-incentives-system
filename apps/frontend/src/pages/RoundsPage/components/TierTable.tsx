import styled from 'styled-components'
import { CheckSVG, LockSVG } from '@ensdomains/thorin'
import { TierDots } from '@/components/shared/TierDots'
import type { TierEntry } from '@/api/types'
import { tokens } from '@/styles/tokens'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Label = styled.span`
  font-size: 13px;
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${tokens.color.accent};
`

const Description = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.textMuted};
  margin: 0;
  line-height: 1.5;
`

const TierList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const TierRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.md};
  background: ${({ $active }) =>
    $active ? 'rgba(0, 124, 35, 0.12)' : tokens.color.surfaceAlt};
  border: 1px solid
    ${({ $active }) => ($active ? 'rgba(0, 124, 35, 0.3)' : 'transparent')};
`

const TierInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const TierName = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.text};
  min-width: 56px;
`

const PoolSize = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.textMuted};
`

const StatusIcon = styled.span<{ $unlocked: boolean }>`
  display: flex;
  align-items: center;
  opacity: ${({ $unlocked }) => ($unlocked ? 1 : 0.4)};
  color: ${({ $unlocked }) => ($unlocked ? tokens.color.positive : tokens.color.textMuted)};

  svg {
    width: 16px;
    height: 16px;
  }
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
                {tier.isUnlocked ? <CheckSVG /> : <LockSVG />}
              </StatusIcon>
            </TierRow>
          )
        })}
      </TierList>
    </Container>
  )
}
