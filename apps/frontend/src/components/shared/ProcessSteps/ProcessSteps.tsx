import { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { tokens } from '@/styles/tokens'

/* ─── Types ─── */

export interface ProcessStep {
  title: string
  desc: string
  icon?: ReactNode
}

interface ProcessStepsProps {
  steps: ProcessStep[]
  /**
   * Layout override.
   * - `horizontal`: force horizontal at all viewports
   * - `vertical`: force vertical at all viewports
   * - omitted (default): horizontal at ≥768px, vertical below
   */
  variant?: 'horizontal' | 'vertical'
  className?: string
}

/* ─── Constants ─── */

const BUBBLE_SIZE_DESKTOP = 32
const BUBBLE_SIZE_MOBILE = 28

/* ─── Styles ─── */

const horizontalLayout = css`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: ${tokens.spacing.xl};
  align-items: start;
`

const verticalLayout = css`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xl};
`

const List = styled.ol<{ $variant?: 'horizontal' | 'vertical' }>`
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: process-step;

  ${({ $variant }) => {
    if ($variant === 'horizontal') return horizontalLayout
    if ($variant === 'vertical') return verticalLayout
    // Responsive default: vertical below 768px, horizontal at/above.
    return css`
      ${verticalLayout}
      @media (min-width: 768px) {
        ${horizontalLayout}
      }
    `
  }}
`

const horizontalItem = css`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  row-gap: ${tokens.spacing.md};
  align-items: start;
  position: relative;
  padding-top: 0;

  /* Horizontal connector: thin line from this bubble's right edge to the next bubble. */
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: ${BUBBLE_SIZE_DESKTOP / 2}px;
    left: calc(50% + ${BUBBLE_SIZE_DESKTOP / 2}px + ${tokens.spacing.sm});
    right: calc(-50% + ${BUBBLE_SIZE_DESKTOP / 2}px + ${tokens.spacing.sm});
    height: 1px;
    background: ${tokens.color.borderLight};
    transform: translateY(-0.5px);
  }
`

const verticalItem = css`
  display: grid;
  grid-template-columns: ${BUBBLE_SIZE_MOBILE}px 1fr;
  grid-template-rows: auto;
  column-gap: ${tokens.spacing.lg};
  align-items: start;
  position: relative;

  /* Vertical connector: line above the bubble linking to the previous step's bubble. */
  &:not(:first-child)::before {
    content: '';
    position: absolute;
    left: ${BUBBLE_SIZE_MOBILE / 2}px;
    top: calc(-1 * ${tokens.spacing.xl});
    height: ${tokens.spacing.xl};
    width: 1px;
    background: ${tokens.color.borderLight};
    transform: translateX(-0.5px);
  }
`

const Item = styled.li<{ $variant?: 'horizontal' | 'vertical' }>`
  ${({ $variant }) => {
    if ($variant === 'horizontal') return horizontalItem
    if ($variant === 'vertical') return verticalItem
    return css`
      ${verticalItem}
      @media (min-width: 768px) {
        ${horizontalItem}

        /* Reset vertical-only connector when responsive */
        &:not(:first-child)::before {
          content: none;
        }
      }
    `
  }}
`

const horizontalBubble = css`
  width: ${BUBBLE_SIZE_DESKTOP}px;
  height: ${BUBBLE_SIZE_DESKTOP}px;
  font-size: ${tokens.font.size.base};
  justify-self: center;
`

const verticalBubble = css`
  width: ${BUBBLE_SIZE_MOBILE}px;
  height: ${BUBBLE_SIZE_MOBILE}px;
  font-size: ${tokens.font.size.sm};
  justify-self: start;
`

const Bubble = styled.span<{ $variant?: 'horizontal' | 'vertical' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${tokens.color.blue};
  color: ${tokens.color.white};
  font-family: ${tokens.font.mono};
  font-weight: ${tokens.font.weight.bold};
  line-height: 1;
  flex-shrink: 0;
  position: relative;
  z-index: 1;

  ${({ $variant }) => {
    if ($variant === 'horizontal') return horizontalBubble
    if ($variant === 'vertical') return verticalBubble
    return css`
      ${verticalBubble}
      @media (min-width: 768px) {
        ${horizontalBubble}
      }
    `
  }}
`

const horizontalBody = css`
  text-align: center;
  padding: 0 ${tokens.spacing.sm};
`

const verticalBody = css`
  text-align: left;
  padding: 0;
`

const Body = styled.div<{ $variant?: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  min-width: 0;

  ${({ $variant }) => {
    if ($variant === 'horizontal') return horizontalBody
    if ($variant === 'vertical') return verticalBody
    return css`
      ${verticalBody}
      @media (min-width: 768px) {
        ${horizontalBody}
      }
    `
  }}
`

const TitleRow = styled.div<{ $variant?: 'horizontal' | 'vertical' }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.spacing.xs};

  ${({ $variant }) => {
    if ($variant === 'horizontal')
      return css`
        justify-content: center;
        align-self: center;
      `
    if ($variant === 'vertical')
      return css`
        justify-content: flex-start;
      `
    return css`
      justify-content: flex-start;
      @media (min-width: 768px) {
        justify-content: center;
        align-self: center;
      }
    `
  }}
`

const IconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: ${tokens.color.darkBlue};
  flex-shrink: 0;

  & > svg {
    width: 16px;
    height: 16px;
  }
`

const Title = styled.h3`
  margin: 0;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkBlue};
  line-height: 1.4;
`

const Desc = styled.p`
  margin: 0;
  font-size: ${tokens.font.size.sm};
  color: ${tokens.color.darkGray};
  line-height: 1.55;
  /* Keep desc short — max 3 short lines visually. */
  max-width: 28ch;
`

/* ─── Component ─── */

export function ProcessSteps({ steps, variant, className }: ProcessStepsProps) {
  return (
    <List $variant={variant} className={className}>
      {steps.map((step, i) => (
        <Item key={i} $variant={variant}>
          <Bubble $variant={variant} aria-hidden>
            {i + 1}
          </Bubble>
          <Body $variant={variant}>
            <TitleRow $variant={variant}>
              {step.icon ? <IconSlot aria-hidden>{step.icon}</IconSlot> : null}
              <Title>{step.title}</Title>
            </TitleRow>
            <Desc>{step.desc}</Desc>
          </Body>
        </Item>
      ))}
    </List>
  )
}
