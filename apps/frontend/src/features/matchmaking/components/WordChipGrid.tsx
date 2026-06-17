import styled from 'styled-components'
import { tokens } from '@/styles'
import type { PoolWord } from '@/api'

export interface WordChipGridProps {
  pool: PoolWord[]
  /** Selected word ids. */
  selected: string[]
  onToggle: (id: string) => void
  /** Max selectable (SELECTION_COUNT). Non-selected chips disable at the cap. */
  max: number
}

/**
 * Uniform-weight chip multi-select for the word pool. Every chip is the same
 * size/weight regardless of label so visual sizing never biases the choice
 * (spec layout concern). Shared by FE-1 (Select) and FE-2 (Edit).
 */
export function WordChipGrid({ pool, selected, onToggle, max }: WordChipGridProps) {
  const selectedSet = new Set(selected)
  const atMax = selected.length >= max

  return (
    <Grid role="group" aria-label="Value words">
      {pool.map((w) => {
        const isSelected = selectedSet.has(w.id)
        const disabled = !isSelected && atMax
        return (
          <Chip
            key={w.id}
            type="button"
            aria-pressed={isSelected}
            $selected={isSelected}
            disabled={disabled}
            onClick={() => onToggle(w.id)}
          >
            {w.label}
          </Chip>
        )
      })}
    </Grid>
  )
}

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.button<{ $selected: boolean }>`
  appearance: none;
  cursor: pointer;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.medium};
  line-height: 1.2;
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  border: 1px solid
    ${({ $selected }) => ($selected ? tokens.color.blue : tokens.color.border)};
  background: ${({ $selected }) =>
    $selected ? tokens.color.blue : tokens.color.surface};
  color: ${({ $selected }) =>
    $selected ? tokens.color.white : tokens.color.darkBlue};
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast},
    color ${tokens.transition.fast};

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
