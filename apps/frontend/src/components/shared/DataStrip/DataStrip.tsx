import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'
import { tokens } from '@/styles/tokens'

/* -------------------------------------------------------------------------- */
/*  DataStrip — flat horizontal row of data points with optional dividers.    */
/*                                                                            */
/*  Differs from <StatStrip/> (which arranges <StatCard/>s in a grid):        */
/*  no card chrome, no shadow, no border. The strip lives on a transparent    */
/*  background — the caller picks the surface.                                */
/* -------------------------------------------------------------------------- */

type Gap = 'sm' | 'md' | 'lg'

const gapMap: Record<Gap, string> = {
  sm: tokens.spacing.md,
  md: tokens.spacing.lg,
  lg: tokens.spacing.xl,
}

export interface DataStripProps {
  children: ReactNode
  /** Spacing between items. Maps sm→12px, md→16px, lg→20px. Default 'md'. */
  gap?: Gap
  /** Render a vertical hairline between items. Default true. */
  divider?: boolean
  className?: string
}

const Strip = styled.div<{ $gap: Gap; $divider: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  column-gap: ${({ $gap }) => gapMap[$gap]};
  row-gap: ${({ $gap }) => gapMap[$gap]};
  min-width: 0;
  background: transparent;

  /* Vertical dividers: 1px hairline on every item except the first. */
  ${({ $divider }) =>
    $divider &&
    css`
      & > * {
        padding-left: ${tokens.spacing.lg};
        border-left: 1px solid ${tokens.color.borderLight};
      }
      & > *:first-child {
        padding-left: 0;
        border-left: none;
      }
    `}

  /* Mobile: items wrap if more than 2. Dividers stay on same-row neighbors */
  /* and disappear at the wrap (the wrapped item becomes the row's first    */
  /* column, so we strip its border there).                                 */
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    ${({ $divider }) =>
      $divider &&
      css`
        & > *:nth-child(2n + 1) {
          padding-left: 0;
          border-left: none;
        }
      `}
  }
`

export function DataStrip({
  children,
  gap = 'md',
  divider = true,
  className,
}: DataStripProps) {
  return (
    <Strip $gap={gap} $divider={divider} className={className}>
      {children}
    </Strip>
  )
}

/* -------------------------------------------------------------------------- */
/*  DataStripItem — label / value / sub stacked vertically.                   */
/*  Renders as <a> when `href` is set, with a subtle color hover.             */
/* -------------------------------------------------------------------------- */

export interface DataStripItemProps {
  label: string
  value: ReactNode
  sub?: string
  /** When set, the whole item renders as an <a> with subtle hover. */
  href?: string
  /** External link target. Defaults to same-tab. */
  target?: '_blank' | '_self'
  /** Forced override of the auto-built aria-label ("label · value · sub"). */
  ariaLabel?: string
  className?: string
}

const itemBase = css`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.xs};
  min-width: 0;
`

const ItemDiv = styled.div`
  ${itemBase}
`

const ItemLink = styled.a`
  ${itemBase}
  text-decoration: none;
  color: ${tokens.color.darkBlue};
  transition: color ${tokens.motion.inFast};

  &:hover {
    color: ${tokens.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.blue};
    outline-offset: 2px;
    border-radius: ${tokens.radius.sm};
  }
`

const Label = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
  line-height: 1.3;
`

const Value = styled.span`
  font-family: ${tokens.font.mono};
  font-variant-numeric: tabular-nums;
  font-size: ${tokens.font.size.base};
  font-weight: ${tokens.font.weight.bold};
  color: inherit;
  line-height: 1.3;
  min-width: 0;
  overflow-wrap: anywhere;
`

const Sub = styled.span`
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.normal};
  color: ${tokens.color.darkGray};
  line-height: 1.3;
`

function buildAriaLabel(label: string, value: ReactNode, sub?: string) {
  const parts: string[] = [label]
  if (typeof value === 'string' || typeof value === 'number') {
    parts.push(String(value))
  }
  if (sub) parts.push(sub)
  return parts.join(' · ')
}

export function DataStripItem({
  label,
  value,
  sub,
  href,
  target,
  ariaLabel,
  className,
}: DataStripItemProps) {
  const computedAria = ariaLabel ?? buildAriaLabel(label, value, sub)

  const body = (
    <>
      <Label>{label}</Label>
      <Value>{value}</Value>
      {sub && <Sub>{sub}</Sub>}
    </>
  )

  if (href) {
    const isExternal = target === '_blank'
    return (
      <ItemLink
        href={href}
        target={target}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        aria-label={computedAria}
        className={className}
      >
        {body}
      </ItemLink>
    )
  }

  return <ItemDiv className={className}>{body}</ItemDiv>
}
