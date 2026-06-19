import styled from 'styled-components'
import { tokens } from '@/styles'

interface StepDotsProps {
  /** Total number of steps. */
  count: number
  /** Zero-based index of the active step. */
  active: number
}

/** Slim progress indicator (● ● ●) for the selection flow's steps. */
export function StepDots({ count, active }: StepDotsProps) {
  return (
    <Row aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} $active={i === active} />
      ))}
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
`

const Dot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: ${tokens.radius.pill};
  background: ${({ $active }) =>
    $active ? tokens.color.blue : '#D1E4FF'};
  transition: background ${tokens.transition.fast};
`
