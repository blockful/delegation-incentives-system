import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { SELECTION_COUNT } from '@ens-dis/domain'
import { tokens } from '@/styles'
import { Modal } from '@/components/shared/Modal'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useWordPool } from '../useWordPool'
import { useSubmitSelection } from '../useSubmitSelection'
import { useMatchCount } from '../useMatchCount'
import { isAtMax, progressFill, toggleSelection } from '../selectionLogic'
import type { ViewerRole } from '../useViewerRole'
import { pitchCopy, confirmCopy, matchPillText } from '../copy'
import { WordChipGrid } from './WordChipGrid'
import { StepDots } from './StepDots'
import { MatchmakingPitch } from './MatchmakingPitch'

type Step = 'pitch' | 'select' | 'confirm'

const STEP_INDEX: Record<Step, number> = { pitch: 0, select: 1, confirm: 2 }

export interface SelectionFlowProps {
  open: boolean
  onClose: () => void
  /** Drives only the Pitch + Confirm copy; the action is identical for both. */
  role: ViewerRole
  /** Surfaces that skip the pitch (e.g. a direct "Select values" CTA) start here. */
  initialStep?: Step
}

/**
 * The shared selection action: Pitch → Select → Confirm in a single centered
 * modal. Parents own *when* it opens (e.g. FE-4's overlay, FE-6's nudge gating);
 * this component owns the steps. "Not now" just calls onClose (dismiss).
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
    setSelected((cur) => toggleSelection(cur, id, SELECTION_COUNT))

  const canSubmit = selected.length === SELECTION_COUNT && !submit.isPending
  const atMax = isAtMax(selected.length, SELECTION_COUNT)

  const handleSubmit = () => {
    // mutate (not mutateAsync) doesn't reject — no empty catch needed. The error
    // is surfaced inline via submit.isError; advance only on success.
    submit.mutate(selected, { onSuccess: () => setStep('confirm') })
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
    <Modal open={open} onClose={onClose} label={title}>
      <Flow>
        <StepDots count={3} active={STEP_INDEX[step]} />

        {step === 'pitch' && (
          <MatchmakingPitch
            title={pitchCopy[role].title}
            body={pitchCopy[role].body}
            primaryLabel={pitchCopy[role].cta}
            onPrimary={() => setStep('select')}
            onSecondary={onClose}
          />
        )}

        {step === 'select' && (
          <Stack>
            <Title $small>Select your values</Title>
            <Body>Pick {SELECTION_COUNT} words that reflect your priorities.</Body>
            {poolLoading || !pool ? (
              <Body>Loading…</Body>
            ) : (
              <WordChipGrid pool={pool} selected={selected} onToggle={toggle} max={SELECTION_COUNT} />
            )}
            <ProgressGroup>
              {atMax && <Hint role="status">Limit reached — deselect one to swap</Hint>}
              <Progress>
                <ProgressTrack
                  role="progressbar"
                  aria-label="Words selected"
                  aria-valuemin={0}
                  aria-valuemax={SELECTION_COUNT}
                  aria-valuenow={selected.length}
                >
                  <ProgressFill style={{ transform: `scaleX(${progressFill(selected.length, SELECTION_COUNT)})` }} />
                </ProgressTrack>
                <Counter aria-live="polite">
                  {selected.length}/{SELECTION_COUNT}
                </Counter>
              </Progress>
            </ProgressGroup>
            {submit.isError && <ErrorText>Couldn&apos;t save your values. Please try again.</ErrorText>}
            <Row>
              {initialStep !== 'select' && (
                <Secondary type="button" onClick={() => setStep('pitch')}>
                  Back
                </Secondary>
              )}
              <Primary type="button" disabled={!canSubmit} onClick={handleSubmit}>
                {submit.isPending ? 'Saving…' : 'Submit'}
              </Primary>
            </Row>
          </Stack>
        )}

        {step === 'confirm' && (
          <Centered>
            <CheckCircle aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </CheckCircle>
            <Title>{confirmCopy[role].title}</Title>
            <Body>{confirmCopy[role].body}</Body>
            {pillN > 0 && <Pill>⭐ {matchPillText(role, pillN)}</Pill>}
            <Actions>
              <Primary type="button" onClick={handleViewMatches}>
                {confirmCopy[role].cta}
              </Primary>
            </Actions>
          </Centered>
        )}
      </Flow>
    </Modal>
  )
}

const Flow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const Centered = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${tokens.spacing.lg};
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.lg};
`

const Title = styled.h2<{ $small?: boolean }>`
  margin: 0;
  font-size: ${({ $small }) => ($small ? tokens.font.size['2xl'] : tokens.font.size['3xl'])};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
  line-height: 1.15;
`

const Body = styled.p`
  margin: 0;
  color: ${tokens.color.textMuted};
  font-size: ${tokens.font.size.lg};
  line-height: 1.56;
`

const CheckCircle = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.tierHighlight};
  color: ${tokens.color.green};
`

const Counter = styled.div`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  white-space: nowrap;
`

// Groups the "limit reached" hint tight to the progress bar (designer review):
// a small gap between them instead of the parent Stack's larger `lg` gap.
const ProgressGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
`

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.md};
`

const ProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: ${tokens.radius.pill};
  background: ${tokens.color.border};
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${tokens.color.blue};
  transform-origin: left center;
  /* Live update as the count changes. */
  transition: transform ${tokens.transition.base};
`

const Hint = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.textMuted};
`

const Pill = styled.div`
  align-self: center;
  background: ${tokens.color.lightBlue};
  color: ${tokens.color.blue};
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
  flex-direction: column;
  gap: ${tokens.spacing.md};
  width: 100%;
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
