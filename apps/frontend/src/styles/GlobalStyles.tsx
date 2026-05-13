import { createGlobalStyle } from 'styled-components'
import { tokens } from './tokens'

/**
 * Global styles that establish the ENS typographic baseline.
 * Applied once at the app root, alongside ThorinGlobalStyles.
 */
export const GlobalStyles = createGlobalStyle`
  html {
    font-family: ${tokens.font.family};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    color: ${tokens.color.text};
    background: ${tokens.color.surface};
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  h1, h2, h3 {
    letter-spacing: 0;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  /* Global link baseline */
  a {
    color: ${tokens.color.blue};
    font-weight: ${tokens.font.weight.medium};
    text-decoration: none;
  }

  :focus-visible {
    outline: 3px solid rgba(82, 152, 255, 0.35);
    outline-offset: 2px;
  }

  /* Tabular numbers for data-heavy interfaces */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  /* Smooth scrolling */
  @media (prefers-reduced-motion: no-preference) {
    html {
      scroll-behavior: smooth;
    }
  }

  /* Selection color matching ENS brand */
  ::selection {
    background: rgba(0, 128, 188, 0.15);
    color: ${tokens.color.text};
  }
`
