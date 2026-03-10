/**
 * Design tokens inspired by ENS Labs' Thorin design system.
 * @see https://thorin.ens.domains
 * @see https://ens.domains/brand
 */

export const colors = {
  blue: "rgb(56, 137, 255)",
  blueActive: "rgb(0, 54, 133)",
  blueDim: "rgb(36, 100, 196)",
  blueBright: "rgb(86, 157, 255)",
  blueLight: "rgb(198, 222, 255)",
  blueSurface: "rgb(232, 242, 255)",

  green: "rgb(25, 156, 117)",
  greenBright: "rgb(21, 132, 99)",
  greenLight: "rgb(196, 233, 220)",
  greenSurface: "rgb(231, 244, 239)",

  red: "rgb(198, 48, 27)",
  redLight: "rgb(240, 194, 194)",
  redSurface: "rgb(248, 232, 230)",

  yellow: "rgb(233, 185, 17)",
  yellowBright: "rgb(240, 201, 60)",
  yellowLight: "rgb(240, 228, 170)",
  yellowSurface: "rgb(249, 244, 226)",

  indigo: "rgb(88, 84, 214)",
  grey: "rgb(155, 155, 167)",
  greyPrimary: "rgb(102, 102, 117)",
  greyLight: "rgb(232, 232, 237)",
  greySurface: "rgb(246, 246, 248)",

  textPrimary: "rgb(18, 18, 24)",
  textSecondary: "rgb(102, 102, 117)",
  textTertiary: "rgb(155, 155, 167)",

  backgroundPrimary: "rgb(255, 255, 255)",
  backgroundSecondary: "rgb(246, 246, 248)",

  border: "rgb(232, 232, 237)",
} as const;

export const fontFamily = {
  sans: '"Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  mono: '"iAWriter Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export const fontSize = {
  headingOne: "2.25rem",
  headingTwo: "1.875rem",
  headingThree: "1.625rem",
  headingFour: "1.375rem",
  extraLarge: "1.25rem",
  large: "1.125rem",
  body: "1rem",
  small: "0.875rem",
  extraSmall: "0.75rem",
} as const;

export const fontWeight = {
  light: 300,
  normal: 500,
  bold: 700,
  extraBold: 830,
} as const;

export const lineHeight = {
  headingOne: "3rem",
  headingTwo: "2.5rem",
  headingThree: "2.125rem",
  headingFour: "1.875rem",
  extraLarge: "1.625rem",
  large: "1.5rem",
  body: "1.25rem",
  small: "1.25rem",
  extraSmall: "1rem",
} as const;

export const radii = {
  none: "0",
  small: "4px",
  medium: "6px",
  large: "8px",
  extraLarge: "12px",
  "2xLarge": "16px",
  "3xLarge": "24px",
  card: "1rem",
  input: "0.5rem",
  full: "9999px",
} as const;

export const space = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
} as const;

export const shadows = {
  none: "none",
  subtle: "0 2px 8px rgba(0, 0, 0, 0.04)",
  card: "0 2px 12px rgba(0, 0, 0, 0.06)",
  elevated: "0 4px 24px rgba(0, 0, 0, 0.08)",
  focus: "0 0 0 3px rgba(56, 137, 255, 0.3)",
} as const;
