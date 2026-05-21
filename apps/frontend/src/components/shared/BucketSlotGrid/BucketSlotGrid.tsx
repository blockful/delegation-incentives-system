import { useMemo, useRef } from 'react'
import styled, { css, keyframes } from 'styled-components'
import type { LotteryEntryDetail } from '@/api/types'
import { tokens } from '@/styles/tokens'

interface BucketSlotGridProps {
  entries: LotteryEntryDetail[]
  winnerAddress: string
  highlightAddress?: string
  onSlotClick?: (entry: LotteryEntryDetail) => void
  height?: number
  ariaLabel?: string
}

interface Slot {
  entry: LotteryEntryDetail
  x: number
  width: number
  isWinner: boolean
  isHighlight: boolean
  label: string
}

const VIEWBOX_W = 1000
const LABEL_MIN_RATIO = 0.04
const STAGGER_PER_SLOT_MS = 5
const STAGGER_CAP_MS = 250

function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}

function shortAddress(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const fadeSlot = keyframes`
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
`

const glowWinner = keyframes`
  0%   { filter: drop-shadow(0 0 0 ${tokens.color.status.success.border}); }
  40%  { filter: drop-shadow(0 0 8px ${tokens.color.status.success.border}); }
  100% { filter: drop-shadow(0 0 0 ${tokens.color.status.success.border}); }
`

const SvgRoot = styled.svg`
  width: 100%;
  display: block;
  overflow: visible;
`

const SlotGroup = styled.g<{ $delayMs: number; $isWinner: boolean }>`
  cursor: pointer;
  opacity: 0;
  animation: ${({ $isWinner }) =>
    $isWinner
      ? css`${fadeSlot} 240ms ease-out forwards, ${glowWinner} 1500ms ease-out 400ms 1`
      : css`${fadeSlot} 240ms ease-out forwards`};
  animation-delay: ${({ $delayMs }) => `${$delayMs}ms`};
  transition: transform ${tokens.transition.fast};
  transform-origin: center;

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;

    rect {
      stroke: ${tokens.color.blue};
      stroke-width: 2;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    animation: none;

    &:hover {
      transform: none;
    }
  }
`

const SlotLabel = styled.text`
  fill: ${tokens.color.darkBlue};
  font-family: ${tokens.font.mono};
  font-size: 11px;
  font-weight: ${tokens.font.weight.semibold};
  pointer-events: none;
  dominant-baseline: middle;
  text-anchor: middle;
`

const WinnerBadge = styled.text`
  fill: ${tokens.color.status.success.fg};
  font-size: 12px;
  font-weight: ${tokens.font.weight.bold};
  pointer-events: none;
  dominant-baseline: middle;
  text-anchor: middle;
`

export function BucketSlotGrid({
  entries,
  winnerAddress,
  highlightAddress,
  onSlotClick,
  height = 64,
  ariaLabel = 'Bucket entry distribution',
}: BucketSlotGridProps) {
  const rootRef = useRef<SVGSVGElement>(null)

  const slots: Slot[] = useMemo(() => {
    if (entries.length === 0) return []
    const totals = entries.reduce((acc, entry) => acc + Math.max(parseFloat(entry.amountEns) || 0, 0), 0)
    if (totals <= 0) {
      // even split fallback
      const w = VIEWBOX_W / entries.length
      return entries.map((entry, i) => ({
        entry,
        x: i * w,
        width: w,
        isWinner: sameAddress(entry.address, winnerAddress),
        isHighlight: sameAddress(entry.address, highlightAddress),
        label: entry.ensName ?? shortAddress(entry.address),
      }))
    }

    let cursor = 0
    return entries.map((entry) => {
      const share = Math.max(parseFloat(entry.amountEns) || 0, 0) / totals
      const width = share * VIEWBOX_W
      const slot: Slot = {
        entry,
        x: cursor,
        width,
        isWinner: sameAddress(entry.address, winnerAddress),
        isHighlight: sameAddress(entry.address, highlightAddress),
        label: entry.ensName ?? shortAddress(entry.address),
      }
      cursor += width
      return slot
    })
  }, [entries, winnerAddress, highlightAddress])

  if (slots.length === 0) return null

  return (
    <SvgRoot
      ref={rootRef}
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${VIEWBOX_W} ${height}`}
      preserveAspectRatio="none"
    >
      {slots.map((slot, idx) => {
        const ratio = slot.width / VIEWBOX_W
        const fill = slot.isWinner
          ? tokens.color.status.success.bg
          : slot.isHighlight
            ? tokens.color.lightBlue
            : tokens.color.bgSubtle
        const stroke = slot.isWinner
          ? tokens.color.status.success.border
          : slot.isHighlight
            ? tokens.color.blue
            : tokens.color.borderLight
        const strokeWidth = slot.isWinner || slot.isHighlight ? 2 : 1
        const showLabel = ratio >= LABEL_MIN_RATIO
        const labelMaxChars = Math.max(3, Math.floor(slot.width / 7))
        const labelText =
          slot.label.length > labelMaxChars ? `${slot.label.slice(0, labelMaxChars - 1)}…` : slot.label
        const delay = Math.min(idx * STAGGER_PER_SLOT_MS, STAGGER_CAP_MS)
        const tooltip = `${slot.entry.ensName ?? slot.entry.address} · ${parseFloat(slot.entry.amountEns).toFixed(4)} ENS · ${(parseFloat(slot.entry.probability) * 100).toFixed(2)}%${slot.isWinner ? ' · Winner' : ''}`

        const handleClick = () => onSlotClick?.(slot.entry)
        const handleKey = (e: React.KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSlotClick?.(slot.entry)
          }
        }

        return (
          <SlotGroup
            key={`${slot.entry.bucketIndex}-${slot.entry.entryIndex}`}
            $delayMs={delay}
            $isWinner={slot.isWinner}
            tabIndex={onSlotClick ? 0 : -1}
            onClick={handleClick}
            onKeyDown={handleKey}
            aria-label={tooltip}
          >
            <title>{tooltip}</title>
            <rect
              x={slot.x + 0.5}
              y={1}
              width={Math.max(slot.width - 1, 0.5)}
              height={height - 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              rx={2}
            />
            {showLabel && (
              <SlotLabel x={slot.x + slot.width / 2} y={height / 2 + (slot.isWinner ? 6 : 0)}>
                {labelText}
              </SlotLabel>
            )}
            {slot.isWinner && showLabel && (
              <WinnerBadge x={slot.x + slot.width / 2} y={height / 2 - 10}>
                ★
              </WinnerBadge>
            )}
          </SlotGroup>
        )
      })}
    </SvgRoot>
  )
}
