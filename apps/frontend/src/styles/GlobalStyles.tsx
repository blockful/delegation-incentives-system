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

  /* Tighten heading letter-spacing per ENS brand guidelines */
  h1, h2, h3 {
    letter-spacing: -0.02em;
  }

  /* Tabular numbers for data-heavy interfaces */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }
`
