import { Fragment } from 'react'
import styled from 'styled-components'
import { tokens } from '@/styles/tokens'

export interface MethodologyStep {
  id: string
  title: string
  subtitle?: string
}

export interface MethodologyDiagramProps {
  steps: MethodologyStep[]
  activeId?: string | null
  onStepClick?: (id: string) => void
}

/* ─── Layout ─── */

const Flow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.spacing.md};
  align-items: stretch;
  justify-items: stretch;

  @media (min-width: 768px) {
    grid-auto-flow: column;
    grid-auto-columns: minmax(140px, 1fr);
    align-items: center;
    gap: ${tokens.spacing.sm};
  }
`

/* ─── Node ─── */

const Node = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: ${tokens.spacing.xs};
  min-height: 80px;
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  background: ${tokens.color.surface};
  border: 1px solid
    ${({ $active }) => ($active ? tokens.color.blue : tokens.color.borderLight)};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.soft};
  color: ${tokens.color.darkBlue};
  transform: ${({ $active }) => ($active ? 'translateY(-1px)' : 'none')};
  transition: border-color 150ms ease, transform 150ms ease;

  &:hover {
    border-color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition: border-color 150ms ease;
  }
`

const NodeTitle = styled.span`
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  line-height: 1.25;
`

const NodeSubtitle = styled.span`
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  line-height: 1.3;
  font-family: ${tokens.font.mono};
`

const NodeFooter = styled.span`
  font-size: ${tokens.font.size.xs};
  color: ${tokens.color.darkGray};
  margin-top: 2px;
`

/* ─── Arrow connector ─── */

const Arrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.color.textFaint};
  justify-self: center;
  align-self: center;

  /* Mobile: downward chevron between stacked nodes */
  width: 100%;
  height: 16px;

  @media (min-width: 768px) {
    width: 24px;
    height: 100%;
  }

  svg {
    display: block;
  }
`

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* The arrow flips between right (desktop) and down (mobile) via CSS visibility. */
const ArrowDesktop = styled.span`
  display: none;
  @media (min-width: 768px) {
    display: inline-flex;
  }
`

const ArrowMobile = styled.span`
  display: inline-flex;
  @media (min-width: 768px) {
    display: none;
  }
`

export function MethodologyDiagram({
  steps,
  activeId,
  onStepClick,
}: MethodologyDiagramProps) {
  return (
    <Flow role="list" aria-label="Algorithm steps">
      {steps.map((step, idx) => (
        <Fragment key={step.id}>
          <Node
            type="button"
            role="listitem"
            $active={activeId === step.id}
            aria-label={`${step.title} step — click for details`}
            aria-pressed={activeId === step.id}
            onClick={() => onStepClick?.(step.id)}
          >
            <NodeTitle>{step.title}</NodeTitle>
            {step.subtitle ? <NodeSubtitle>{step.subtitle}</NodeSubtitle> : null}
            <NodeFooter aria-hidden="true">↗ source</NodeFooter>
          </Node>
          {idx < steps.length - 1 ? (
            <Arrow aria-hidden="true">
              <ArrowDesktop>
                <ChevronRight />
              </ArrowDesktop>
              <ArrowMobile>
                <ChevronDown />
              </ArrowMobile>
            </Arrow>
          ) : null}
        </Fragment>
      ))}
    </Flow>
  )
}

