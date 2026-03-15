/**
 * Shared styled-component primitives used across the app.
 * These enforce consistent typography, spacing, and visual patterns.
 */
import styled, { css } from 'styled-components'
import { tokens } from './tokens'

/* ─── Typography ─── */

export const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${tokens.color.accent};
`

export const PageTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.2;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

export const SectionHeading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.2;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

export const SectionSubheading = styled.p`
  font-size: ${tokens.font.size.md};
  line-height: 1.7;
  color: ${tokens.color.textMuted};
  margin: 0;
`

/* ─── Layout ─── */

export const PageContainer = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: ${tokens.spacing['4xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
`

export const SectionContainer = styled.section<{ $background?: string }>`
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  background: ${({ $background }) => $background ?? 'transparent'};

  @media (min-width: 768px) {
    padding: ${tokens.spacing['8xl']} ${tokens.spacing['4xl']};
  }
`

export const SectionInner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
`

/* ─── Cards ─── */

export const cardStyles = css`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.lg};
  transition: border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.fast};
`

export const cardHoverStyles = css`
  &:hover {
    border-color: ${tokens.color.gray3};
    box-shadow: ${tokens.shadow.sm};
  }
`

export const CardLink = styled.a`
  ${cardStyles}
  ${cardHoverStyles}
  display: flex;
  align-items: center;
  gap: ${tokens.spacing.lg};
  padding: ${tokens.spacing.xl};
  text-decoration: none;
  color: inherit;
  cursor: pointer;
`

/* ─── Labels & Stats ─── */

export const StatLabel = styled.span`
  font-size: ${tokens.font.size.xs};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.textMuted};
`

export const StatValue = styled.span`
  font-size: ${tokens.font.size['2xl']};
  font-weight: ${tokens.font.weight.bold};
  color: ${tokens.color.text};
`

export const Chevron = styled.span`
  font-size: ${tokens.font.size.xl};
  color: ${tokens.color.textFaint};
`

/* ─── Status ─── */

export const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`

export const ErrorMessage = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`
