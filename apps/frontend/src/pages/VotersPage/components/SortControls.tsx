import styled from 'styled-components'
import { tokens } from '@/styles'

export type SortField = 'random' | 'votingPower' | 'activity' | 'activeSince' | 'match'
export type SortDirection = 'desc' | 'asc'
export interface SortState {
  field: SortField
  direction: SortDirection
}

interface SortControlsProps {
  value: SortState
  onChange: (v: SortState) => void
  onShuffle: () => void
  /** Show the Match tab — only meaningful once the viewer has selected (FE-3). */
  showMatch?: boolean
}

const baseFields: { value: SortField; label: string }[] = [
  { value: 'votingPower', label: 'Voting Power' },
  { value: 'activity', label: 'Activity' },
  { value: 'activeSince', label: 'First Active' },
  { value: 'random', label: 'Random' },
]

const matchField: { value: SortField; label: string } = { value: 'match', label: 'Match' }

const Wrapper = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
`

const SortLabel = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.textSecondary};
  flex-shrink: 0;
  margin-right: ${tokens.spacing.xs};
`

const Pill = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid ${({ $active }) =>
    $active ? tokens.color.darkBlue : tokens.color.borderLight};
  background: ${({ $active }) =>
    $active ? tokens.color.darkBlue : tokens.color.surface};
  color: ${({ $active }) =>
    $active ? tokens.color.white : tokens.color.textSecondary};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  line-height: 20px;
  cursor: pointer;
  transition: all ${tokens.transition.fast};
  flex-shrink: 0;

  &:hover {
    opacity: 0.85;
  }
`

function directionIndicator(field: SortField, dir: SortDirection): string {
  if (field === 'random') return ' ↻'
  return dir === 'desc' ? ' ↓' : ' ↑'
}

export function SortControls({ value, onChange, onShuffle, showMatch = false }: SortControlsProps) {
  const fields = showMatch ? [matchField, ...baseFields] : baseFields

  function handleClick(field: SortField) {
    if (field === 'random') {
      if (value.field === 'random') {
        onShuffle()
      } else {
        onChange({ field: 'random', direction: 'desc' })
      }
      return
    }
    if (value.field === field) {
      onChange({ field, direction: value.direction === 'desc' ? 'asc' : 'desc' })
    } else {
      const defaultDir = field === 'activeSince' ? 'asc' : 'desc'
      onChange({ field, direction: defaultDir })
    }
  }

  return (
    <Wrapper>
      <SortLabel>Sort by</SortLabel>
      {fields.map((opt) => (
        <Pill
          key={opt.value}
          $active={value.field === opt.value}
          onClick={() => handleClick(opt.value)}
          aria-pressed={value.field === opt.value}
        >
          {opt.label}
          {value.field === opt.value && directionIndicator(opt.value, value.direction)}
        </Pill>
      ))}
    </Wrapper>
  )
}
