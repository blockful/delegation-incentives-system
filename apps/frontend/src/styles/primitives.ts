/**
 * Shared styled-component primitives used across the app.
 * These enforce consistent typography, spacing, and visual patterns.
 */
import styled, { css, keyframes } from 'styled-components'
import { tokens } from './tokens'

/* ─── Animations ─── */

export const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

/* ─── Typography ─── */

export const Eyebrow = styled.span`
  display: block;
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
  color: ${tokens.color.darkGray};
`

export const PageTitle = styled.h1`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.15;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

export const SectionHeading = styled.h2`
  font-size: ${tokens.font.size['3xl']};
  font-weight: ${tokens.font.weight.extrabold};
  color: ${tokens.color.text};
  line-height: 1.15;
  margin: 0;

  @media (min-width: 768px) {
    font-size: ${tokens.font.size['4xl']};
  }
`

export const SectionSubheading = styled.p`
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
  color: ${tokens.color.textMuted};
  margin: 0;
`

/* ─── Gradient text (ENS signature style) ─── */

export const gradientTextStyles = css`
  background: linear-gradient(135deg, ${tokens.color.blue} 0%, ${tokens.color.accent} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

/* ─── Layout ─── */

export const PageContainer = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing['3xl']};
  animation: ${fadeInUp} 0.4s ease both;

  @media (min-width: 768px) {
    padding: ${tokens.spacing['4xl']} ${tokens.spacing['2xl']};
  }
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
  border: 1px solid ${tokens.color.gray};
  border-radius: ${tokens.radius.md};
  transition:
    border-color ${tokens.transition.fast},
    box-shadow ${tokens.transition.base},
    transform ${tokens.transition.base};
`

export const cardHoverStyles = css`
  &:hover {
    border-color: ${tokens.color.blue};
    box-shadow: ${tokens.shadow.md};
    transform: translateY(-1px);
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
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.semibold};
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
  transition: transform ${tokens.transition.fast};
`

/* ─── Status ─── */

export const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  animation: ${fadeIn} 0.3s ease;
`

export const ErrorMessage = styled.p`
  text-align: center;
  padding: ${tokens.spacing['6xl']} ${tokens.spacing.xl};
  color: ${tokens.color.negative};
  font-size: ${tokens.font.size.lg};
`
