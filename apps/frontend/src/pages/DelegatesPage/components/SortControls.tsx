import styled from 'styled-components'

export type SortField = 'random' | 'votingPower' | 'activity'
export type SortDirection = 'desc' | 'asc'
export interface SortState {
  field: SortField
  direction: SortDirection
}

interface SortControlsProps {
  value: SortState
  onChange: (v: SortState) => void
  onShuffle: () => void
}

const fields: { value: SortField; label: string }[] = [
  { value: 'random', label: 'Random' },
  { value: 'votingPower', label: 'Voting Power' },
  { value: 'activity', label: 'Activity' },
]

const Wrapper = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const Pill = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.text : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.background : theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.8;
  }
`

const ShuffleButton = styled.button`
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.8;
  }
`

function directionArrow(dir: SortDirection): string {
  return dir === 'desc' ? ' ↓' : ' ↑'
}

export function SortControls({ value, onChange, onShuffle }: SortControlsProps) {
  function handleClick(field: SortField) {
    if (field === 'random') {
      onChange({ field: 'random', direction: 'desc' })
      return
    }
    if (value.field === field) {
      // Toggle direction
      onChange({ field, direction: value.direction === 'desc' ? 'asc' : 'desc' })
    } else {
      onChange({ field, direction: 'desc' })
    }
  }

  return (
    <Wrapper>
      {fields.map((opt) => (
        <Pill
          key={opt.value}
          $active={value.field === opt.value}
          onClick={() => handleClick(opt.value)}
          aria-pressed={value.field === opt.value}
        >
          {opt.label}
          {value.field === opt.value && opt.value !== 'random' && directionArrow(value.direction)}
        </Pill>
      ))}
      {value.field === 'random' && (
        <ShuffleButton onClick={onShuffle} title="Shuffle">
          ↻
        </ShuffleButton>
      )}
    </Wrapper>
  )
}
