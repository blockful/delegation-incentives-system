import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { SELECTION_COUNT } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { SideDrawer } from '@/components/shared/SideDrawer'
import { useWordPool } from '../useWordPool'
import { useMySelection } from '../useMySelection'
import { useSubmitSelection } from '../useSubmitSelection'
import { WordChipGrid } from './WordChipGrid'

export interface EditSelectionModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

/**
 * Prefilled edit of the current selection — the same WordChipGrid as FE-1's
 * Select step, seeded with the wallet's stored words, with Cancel / Save.
 * Reachable from the Dashboard "Values" card and own-profile (FE-5/FE-6 own
 * those buttons + the open state).
 *
 * Save behavior (Q#6): on success we close and let the cache invalidation in
 * useSubmitSelection refresh every surface. There's no app-wide toast system, so
 * the visible resolved state is the confirmation; failures surface inline.
 */
export function EditSelectionModal({ open, onClose, onSaved }: EditSelectionModalProps) {
  const { pool, loading: poolLoading } = useWordPool()
  const { words: current } = useMySelection()
  const submit = useSubmitSelection()
  const [selected, setSelected] = useState<string[]>([])

  // Prefill with the stored selection when the modal opens or the data loads.
  useEffect(() => {
    if (open && current) setSelected(current)
  }, [open, current])

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < SELECTION_COUNT
          ? [...cur, id]
          : cur,
    )

  const canSave = selected.length === SELECTION_COUNT && !submit.isPending

  const handleSave = async () => {
    try {
      await submit.mutateAsync(selected)
      onSaved?.()
      onClose()
    } catch {
      // surfaced inline via submit.isError
    }
  }

  return (
    <SideDrawer open={open} onClose={onClose} title="Edit your values">
      <Stack>
        <Body>Update the {SELECTION_COUNT} words that reflect your priorities.</Body>
        {poolLoading || !pool ? (
          <Body>Loading…</Body>
        ) : (
          <WordChipGrid pool={pool} selected={selected} onToggle={toggle} max={SELECTION_COUNT} />
        )}
        <Counter aria-live="polite">
          {selected.length}/{SELECTION_COUNT}
        </Counter>
        {submit.isError && <ErrorText>Couldn&apos;t save your values. Please try again.</ErrorText>}
        <Actions>
          <Primary type="button" disabled={!canSave} onClick={handleSave}>
            {submit.isPending ? 'Saving…' : 'Save'}
          </Primary>
          <Secondary type="button" onClick={onClose}>
            Cancel
          </Secondary>
        </Actions>
      </Stack>
    </SideDrawer>
  )
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Body = styled.p`
  margin: 0;
  color: ${tokens.color.darkGray};
  font-size: ${tokens.font.size.base};
  line-height: 1.5;
`

const Counter = styled.div`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
`

const ErrorText = styled.p`
  margin: 0;
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.sm};
`

const Actions = styled.div`
  display: flex;
  gap: ${tokens.spacing.sm};
`

const Primary = styled.button`
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: none;
  border-radius: ${tokens.radius.md};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover:not(:disabled) {
    background: ${tokens.color.accent};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Secondary = styled.button`
  background: transparent;
  color: ${tokens.color.darkBlue};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  padding: ${tokens.spacing.sm} ${tokens.spacing.lg};
  cursor: pointer;
  transition: background ${tokens.transition.fast};

  &:hover {
    background: ${tokens.color.bgSubtle};
  }
`
