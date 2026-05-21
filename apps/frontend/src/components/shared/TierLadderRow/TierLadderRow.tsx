import styled from 'styled-components'
import { CheckSVG, LockSVG } from '@ensdomains/thorin'
import { tokens } from '@/styles/tokens'
import { formatPool } from '@/utils/dashboard'
import type { TierEntry } from '@/api/types'

interface TierLadderRowProps {
  tier: TierEntry
  total: number
  isCurrent?: boolean
  isLocked?: boolean
  showAprLabel?: boolean
  compact?: boolean
  className?: string
}

const Row = styled.div<{ $isCurrent: boolean; $isLocked: boolean; $compact: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.spacing['2xl']};
  padding: ${({ $compact }) =>
    $compact ? `6px ${tokens.spacing.sm}` : `10px ${tokens.spacing.md}`};
  margin: 2px ${tokens.spacing.xs};
  border-radius: ${tokens.radius.sm};
  background: ${({ $isCurrent }) =>
    $isCurrent ? tokens.color.tierHighlight : 'transparent'};
  opacity: ${({ $isLocked }) => ($isLocked ? 0.55 : 1)};
  border-left: 3px solid
    ${({ $isCurrent }) => ($isCurrent ? tokens.color.positiveEmphasis : 'transparent')};
  padding-left: ${({ $isCurrent }) =>
    $isCurrent ? tokens.spacing.md : tokens.spacing.md};
`

const TierLabel = styled.span<{ $isCurrent: boolean; $compact: boolean }>`
  font-size: ${({ $compact }) => ($compact ? tokens.font.size.base : tokens.font.size.lg)};
  font-weight: ${({ $isCurrent }) =>
    $isCurrent ? tokens.font.weight.bold : tokens.font.weight.medium};
  color: ${tokens.color.darkBlue};
  flex-shrink: 0;
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const Dots = styled.div`
  display: flex;
  gap: ${tokens.spacing.xs};
  align-items: center;
`

const Dot = styled.div<{ $filled: boolean; $isUnlocked: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $filled, $isUnlocked }) =>
    $filled
      ? $isUnlocked
        ? tokens.color.positiveEmphasis
        : tokens.color.darkBlue
      : tokens.color.middleGray};
`

const AprText = styled.span<{ $isUnlocked: boolean; $compact: boolean }>`
  font-size: ${({ $compact }) => ($compact ? tokens.font.size.base : tokens.font.size.lg)};
  font-weight: ${tokens.font.weight.semibold};
  color: ${({ $isUnlocked }) =>
    $isUnlocked ? tokens.color.positiveEmphasis : tokens.color.darkBlue};
  width: 100px;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

const PoolText = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  min-width: 80px;
  white-space: nowrap;
`

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
  }
`

export function TierLadderRow({
  tier,
  total,
  isCurrent: isCurrentProp,
  isLocked: isLockedProp,
  showAprLabel = true,
  compact = false,
  className,
}: TierLadderRowProps) {
  const isCurrent = isCurrentProp ?? false
  const isLocked = isLockedProp ?? !tier.isUnlocked
  const aprLabel = tier.estimatedAprPct != null ? `~${tier.estimatedAprPct}% APR` : '—'

  return (
    <Row
      $isCurrent={isCurrent}
      $isLocked={isLocked}
      $compact={compact}
      className={className}
      aria-label={`Tier ${tier.index + 1}${isCurrent ? ' (current)' : isLocked ? ' (locked)' : ''}`}
    >
      <TierLabel $isCurrent={isCurrent} $compact={compact}>
        Tier #{tier.index + 1}
      </TierLabel>
      <Right>
        <PoolText>{formatPool(tier.poolSizeEns)} ENS</PoolText>
        <Dots aria-hidden>
          {Array.from({ length: total }, (_, j) => (
            <Dot key={j} $filled={j <= tier.index} $isUnlocked={tier.isUnlocked} />
          ))}
        </Dots>
        {showAprLabel && (
          <AprText $isUnlocked={tier.isUnlocked} $compact={compact}>
            {aprLabel}
          </AprText>
        )}
        <StatusIcon aria-hidden>
          {tier.isUnlocked ? (
            <CheckSVG style={{ color: tokens.color.positiveEmphasis }} />
          ) : (
            <LockSVG style={{ color: tokens.color.darkBlue }} />
          )}
        </StatusIcon>
      </Right>
    </Row>
  )
}
