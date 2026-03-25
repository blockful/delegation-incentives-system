import React from 'react'
import styled from 'styled-components'
import { Card, CheckSVG, LockSVG } from '@ensdomains/thorin'
import { tokens, Eyebrow } from '@/styles'
import type { TierEntry } from '@/api/types'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Description = styled.p`
  font-size: ${tokens.font.size.base};
  color: ${tokens.color.darkGray};
  margin: 0;
  line-height: 1.5;
`

const TierCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  width: 100%;
  min-width: 0;
  box-shadow: ${tokens.shadow.sm};
`

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background: ${tokens.color.borderLight};
  flex-shrink: 0;
`

const TierRow = styled.div<{ $isCurrent: boolean; $isLocked: boolean }>`
  display: grid;
  grid-template-columns: 52px 1fr auto auto;
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 4px ${tokens.spacing.xs};
  border-radius: ${tokens.radius.sm};
  background: ${({ $isCurrent }) => ($isCurrent ? tokens.color.tierHighlight : 'transparent')};
  opacity: ${({ $isLocked }) => ($isLocked ? 0.5 : 1)};
`

const TierLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
`

const TierRight = styled.div``

const Dots = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean; $isUnlocked: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $isUnlocked }) =>
    $filled
      ? ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)
      : tokens.color.middleGray};
`

const ApyText = styled.span<{ $isUnlocked: boolean }>`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $isUnlocked }) => ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)};
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }
`

export function TierTable({ tiers, currentTierIndex }: TierTableProps) {
  return (
    <Container>
      <Eyebrow>APY Tiers</Eyebrow>
      <Description>
        Higher tiers unlock as more ENS gets delegated. Earn better APY the
        further you progress.
      </Description>
      <TierCard data-testid="tier-table">
        {tiers.map((tier, i) => {
          const isLocked = !tier.isUnlocked
          const isCurrent = tier.index === currentTierIndex
          const apyLabel = tier.estimatedApyPct != null ? `~${tier.estimatedApyPct}% APY` : '—'
          return (
            <React.Fragment key={tier.index}>
              {i > 0 && <Separator />}
              <TierRow $isCurrent={isCurrent} $isLocked={isLocked}>
                <TierLabel>Tier #{tier.index + 1}</TierLabel>
                <Dots>
                  {Array.from({ length: tiers.length }, (_, j) => (
                    <Dot key={j} $filled={j <= tier.index} $isUnlocked={tier.isUnlocked} />
                  ))}
                </Dots>
                <ApyText $isUnlocked={tier.isUnlocked}>{apyLabel}</ApyText>
                <StatusIcon>
                  {tier.isUnlocked ? (
                    <CheckSVG style={{ color: tokens.color.positiveEmphasis }} />
                  ) : (
                    <LockSVG style={{ color: tokens.color.darkBlue }} />
                  )}
                </StatusIcon>
              </TierRow>
            </React.Fragment>
          )
        })}
      </TierCard>
    </Container>
  )
}
