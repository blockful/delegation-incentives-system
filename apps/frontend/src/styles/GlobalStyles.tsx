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
    /* ENS-style subtle radial gradient background */
    background-image: radial-gradient(
      ellipse 80% 60% at 50% -10%,
      rgba(0, 128, 188, 0.04) 0%,
      transparent 70%
    );
    background-attachment: fixed;
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
