import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { SELECTION_COUNT } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { SideDrawer } from '@/components/shared/SideDrawer'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useWordPool } from '../useWordPool'
import { useSubmitSelection } from '../useSubmitSelection'
import { useMatchCount } from '../useMatchCount'
import type { ViewerRole } from '../useViewerRole'
import { pitchCopy, confirmCopy, matchPillText } from '../copy'
import { WordChipGrid } from './WordChipGrid'

type Step = 'pitch' | 'select' | 'confirm'

export interface SelectionFlowProps {
  open: boolean
  onClose: () => void
  /** Drives only the Pitch + Confirm copy; the action is identical for both. */
  role: ViewerRole
  /** Surfaces that skip the pitch (e.g. a direct "Select values" CTA) start here. */
  initialStep?: Step
}

/**
 * The shared selection action: Pitch → Select → Confirm in a single drawer.
 * Parents own *when* it opens (e.g. FE-4's overlay, FE-6's nudge gating); this
 * component owns the steps. "Not now" just calls onClose (dismiss).
 */
export function SelectionFlow({ open, onClose, role, initialStep = 'pitch' }: SelectionFlowProps) {
  const [step, setStep] = useState<Step>(initialStep)
  const [selected, setSelected] = useState<string[]>([])

  const { pool, loading: poolLoading } = useWordPool()
  const submit = useSubmitSelection()
  const wallet = useWalletState()
  const address = wallet.status === 'disconnected' ? undefined : wallet.address
  // Only fetch the pill count once we reach Confirm.
  const { matchingActiveVoters, matchingHolders } = useMatchCount(
    step === 'confirm' ? address : undefined,
  )
  const navigate = useNavigate()

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < SELECTION_COUNT
          ? [...cur, id]
          : cur,
    )

  const canSubmit = selected.length === SELECTION_COUNT && !submit.isPending

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync(selected)
      setStep('confirm')
    } catch {
      // surfaced inline via submit.isError
    }
  }

  const handleViewMatches = () => {
    onClose()
    navigate(role === 'delegate' && address ? `/voters/${address}` : '/voters')
  }

  const pillN = role === 'holder' ? matchingActiveVoters : matchingHolders

  const title =
    step === 'pitch'
      ? pitchCopy[role].title
      : step === 'select'
        ? 'Select your values'
        : confirmCopy[role].title

  return (
    <SideDrawer open={open} onClose={onClose} title={title}>
      {step === 'pitch' && (
        <Stack>
          <Body>{pitchCopy[role].body}</Body>
          <Actions>
            <Primary type="button" onClick={() => setStep('select')}>
              {pitchCopy[role].cta}
            </Primary>
            <Secondary type="button" onClick={onClose}>
              Not now
            </Secondary>
          </Actions>
        </Stack>
      )}

      {step === 'select' && (
        <Stack>
          <Body>Pick {SELECTION_COUNT} words that reflect your priorities.</Body>
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
            <Primary type="button" disabled={!canSubmit} onClick={handleSubmit}>
              {submit.isPending ? 'Saving…' : 'Submit'}
            </Primary>
            <Secondary type="button" onClick={() => setStep('pitch')}>
              Back
            </Secondary>
          </Actions>
        </Stack>
      )}

      {step === 'confirm' && (
        <Stack>
          <Body>{confirmCopy[role].body}</Body>
          {pillN > 0 && <Pill>⭐ {matchPillText(role, pillN)}</Pill>}
          <Actions>
            <Primary type="button" onClick={handleViewMatches}>
              {confirmCopy[role].cta}
            </Primary>
          </Actions>
        </Stack>
      )}
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

const Pill = styled.div`
  align-self: flex-start;
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.positiveEmphasis};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  border-radius: ${tokens.radius.pill};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
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
