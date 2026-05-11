import React from 'react'
import styled from 'styled-components'
import { Card, CheckSVG, LockSVG } from '@ensdomains/thorin'
import { tokens, Eyebrow } from '@/styles'
import type { TierEntry } from '@/api/types'
import { formatEnsWhole } from '@/utils/format'

interface TierTableProps {
  tiers: TierEntry[]
  currentTierIndex: number
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
  min-width: 0;
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
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "label status"
    "progress apy";
  align-items: center;
  gap: ${tokens.spacing.sm};
  padding: 4px ${tokens.spacing.xs};
  border-radius: ${tokens.radius.sm};
  background: ${({ $isCurrent }) => ($isCurrent ? tokens.color.tierHighlight : 'transparent')};
  opacity: ${({ $isLocked }) => ($isLocked ? 0.5 : 1)};
  min-width: 0;

  @media (min-width: 480px) {
    grid-template-columns: minmax(76px, max-content) minmax(0, 1fr) auto auto;
    grid-template-areas: "label progress apy status";
  }
`

const TierHeading = styled.span`
  grid-area: label;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const TierLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
`

const PoolText = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  white-space: nowrap;
`

const Dots = styled.div`
  grid-area: progress;
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
`

const Dot = styled.div<{ $filled: boolean; $isUnlocked: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $isUnlocked }) =>
    $filled
      ? ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)
      : tokens.color.middleGray};

  @media (min-width: 480px) {
    width: 7px;
    height: 7px;
  }
`

const ApyText = styled.span<{ $isUnlocked: boolean }>`
  grid-area: apy;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.medium};
  color: ${({ $isUnlocked }) => ($isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue)};
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const StatusIcon = styled.span`
  grid-area: status;
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export function TierTable({ tiers, currentTierIndex }: TierTableProps) {
  return (
    <Container>
      <Eyebrow>APY Tiers</Eyebrow>
      <TierCard data-testid="tier-table" role="list" aria-label="APY tiers">
        {tiers.map((tier, i) => {
          const isLocked = !tier.isUnlocked
          const isCurrent = tier.index === currentTierIndex
          const apyLabel = tier.estimatedApyPct != null ? `~${tier.estimatedApyPct}% APY` : '—'
          const poolLabel = `${formatEnsWhole(tier.poolSizeEns)} ENS`
          const statusLabel = tier.isUnlocked ? 'Unlocked' : 'Locked'
          const rowLabel = [
            `Tier #${tier.index + 1}`,
            `${poolLabel} pool`,
            apyLabel,
            statusLabel.toLowerCase(),
            isCurrent ? 'current tier' : null,
          ].filter(Boolean).join(', ')

          return (
            <React.Fragment key={tier.index}>
              {i > 0 && <Separator />}
              <TierRow
                $isCurrent={isCurrent}
                $isLocked={isLocked}
                role="listitem"
                aria-label={rowLabel}
                data-testid="tier-row"
                data-active={isCurrent}
              >
                <TierHeading>
                  <TierLabel>Tier #{tier.index + 1}</TierLabel>
                  <PoolText>{poolLabel}</PoolText>
                </TierHeading>
                <Dots aria-hidden="true">
                  {Array.from({ length: tiers.length }, (_, j) => (
                    <Dot key={j} $filled={j <= tier.index} $isUnlocked={tier.isUnlocked} />
                  ))}
                </Dots>
                <ApyText $isUnlocked={tier.isUnlocked}>{apyLabel}</ApyText>
                <StatusIcon>
                  {tier.isUnlocked ? (
                    <CheckSVG aria-hidden="true" style={{ color: tokens.color.positiveEmphasis }} />
                  ) : (
                    <LockSVG aria-hidden="true" style={{ color: tokens.color.darkBlue }} />
                  )}
                  <VisuallyHidden>{statusLabel}</VisuallyHidden>
                </StatusIcon>
              </TierRow>
            </React.Fragment>
          )
        })}
      </TierCard>
    </Container>
  )
}
