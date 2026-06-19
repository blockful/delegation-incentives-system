import { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { SELECTION_COUNT } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { Modal } from '@/components/shared/Modal'
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
 * Select step, seeded with the wallet's stored words, with Cancel / Save, in the
 * shared centered Modal. Reachable from the Dashboard "Values" card and
 * own-profile (FE-5/FE-6 own those buttons + the open state).
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

  const handleSave = () => {
    // mutate (not mutateAsync) doesn't reject — no empty catch needed. Advance
    // only on success; the error surfaces inline via submit.isError.
    submit.mutate(selected, {
      onSuccess: () => {
        onSaved?.()
        onClose()
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} label="Edit your values">
      <Stack>
        <Title>Edit your values</Title>
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
        <Row>
          <Secondary type="button" onClick={onClose}>
            Cancel
          </Secondary>
          <Primary type="button" disabled={!canSave} onClick={handleSave}>
            {submit.isPending ? 'Saving…' : 'Save'}
          </Primary>
        </Row>
      </Stack>
    </Modal>
  )
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Title = styled.h2`
  margin: 0;
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  line-height: 1.2;
`

const Body = styled.p`
  margin: 0;
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.lg};
  line-height: 1.56;
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

const Row = styled.div`
  display: flex;
  gap: ${tokens.spacing.md};
  width: 100%;

  & > * {
    flex: 1;
  }
`

const buttonBase = css`
  width: 100%;
  border-radius: ${tokens.radius.lg};
  font-size: ${tokens.font.size.lg};
  font-weight: ${tokens.font.weight.bold};
  padding: 14px ${tokens.spacing.lg};
  cursor: pointer;
  transition:
    background ${tokens.transition.fast},
    border-color ${tokens.transition.fast};
`

const Primary = styled.button`
  ${buttonBase}
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  border: 1px solid ${tokens.color.blue};

  &:hover:not(:disabled) {
    background: ${tokens.color.accent};
    border-color: ${tokens.color.accent};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Secondary = styled.button`
  ${buttonBase}
  background: ${tokens.color.white};
  color: ${tokens.color.textSecondary};
  border: 1px solid ${tokens.color.border};

  &:hover {
    background: ${tokens.color.bgSubtle};
  }
`
