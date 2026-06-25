import { CheckSVG } from '@ensdomains/thorin'
import styled from 'styled-components'
import { tokens } from '@/styles'
import type { PoolWord } from '@/api'
import { isAtMax } from '../selectionLogic'
import { groupPoolByCategory } from '../wordCategories'

export interface WordChipGridProps {
  pool: PoolWord[]
  /** Selected word ids. */
  selected: string[]
  onToggle: (id: string) => void
  /** Max selectable (SELECTION_COUNT). Non-selected chips disable at the cap. */
  max: number
}

/**
 * Uniform-weight chip multi-select for the word pool, grouped under the four
 * named categories (DEV-938). Every chip is the same size/weight regardless of
 * label so visual sizing never biases the choice (spec layout concern). Selected
 * chips carry a Check glyph; at the cap unselected chips dim to 40% + disable.
 * Shared by FE-1 (Select) and FE-2 (Edit).
 */
export function WordChipGrid({ pool, selected, onToggle, max }: WordChipGridProps) {
  const selectedSet = new Set(selected)
  const atMax = isAtMax(selected.length, max)
  const groups = groupPoolByCategory(pool)

  return (
    <Groups role="group" aria-label="Value words">
      {groups.map((group) => (
        <Group key={group.category}>
          <GroupHeading>{group.category}</GroupHeading>
          <Grid>
            {group.words.map((w) => {
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
                  {isSelected && <CheckSVG aria-hidden="true" />}
                  {w.label}
                </Chip>
              )
            })}
          </Grid>
        </Group>
      ))}
    </Groups>
  )
}

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.sm};
`

const GroupHeading = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.semibold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${tokens.color.textSecondary};
`

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.spacing.sm};
`

const Chip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};
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

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  /* At the cap, unselected chips dim to 40% and stop accepting clicks. */
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
