/**
 * Design tokens aligned with ENS brand guidelines.
 * All colors sourced from https://ens.domains/brand#guidelines
 */
export const tokens = {
  color: {
    // Primary — aligned with Thorin DS tokens
    blue: '#3889ff',
    lightBlue: '#EBF3FF',
    lightBlueOpacity: 'rgba(56, 137, 255, 0.12)',
    darkBlue: '#1e2122',
    darkGray: '#5d5c62',
    middleGray: '#D0D7DE',
    gray: '#D0D7DE',
    white: '#fff',

    // Extended
    green: '#199c75',
    greenDeep: '#158463', 

    magenta: '#F53293',
    yellow: '#FFF72F',
    darkBrown: '#674D49',
    lightGreen: '#C5DDCC',
    lightMagenta: '#F2C4DA',
    lightYellow: '#F8F6D6',
    midnightBlue: '#093C52',

    // Semantic
    text: '#1e2122',
    textMuted: '#5d5c62',
    textFaint: '#C4C7C8',
    border: '#e8e8e8',
    surface: '#fff',
    surfaceAlt: '#f6f6f6',
    negative: '#F53293',
    positive: '#199c75',
    positiveEmphasis: '#199c75',
    accent: '#0080BC',
    orange: '#BC4C00',
    lightOrange: '#FFF1E5',
    bgSubtle: '#F6F8FA',
    borderLight: '#e8e8e8',
    tierHighlight: '#e7f4ef',
    textSubtle: '#9b9ba7',
    textSecondary: '#9b9ba7',

    // Surface ladder — page mat vs card; see docs §2.8 DS audit
    surfaceMat: '#FAFAFC',

    // Status families — 5 tones × 3 roles (bg / border / fg)
    // Replaces inline $tone branching in AddressLotteryPanel, StatusPanel, ErrorCard
    status: {
      success: { bg: '#e7f4ef', border: '#199c75', fg: '#199c75' },
      warning: { bg: '#FFF1E5', border: '#BC4C00', fg: '#9A3412' },
      pending: { bg: '#EBF3FF', border: '#3889ff', fg: '#1E5BC9' },
      danger:  { bg: '#FEE9F0', border: '#F53293', fg: '#B91552' },
      neutral: { bg: '#FFFFFF', border: '#e8e8e8', fg: '#5d5c62' },
    },
  },

  radius: {
    sm: '8px',
    card: '8px',
    md: '8px',
    lg: '8px',
    xl: '8px',
    pill: '9999px',
  },

  shadow: {
    // Subtle. Minimal & clean: borders carry surface; shadows are only a hint of lift.
    sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 2px 8px rgba(15, 23, 42, 0.06)',
    lg: '0 4px 16px rgba(15, 23, 42, 0.08)',
    // Default for raised surfaces — 1px hairline + ambient. Prefer this over `md` for cards.
    soft: '0 1px 0 0 rgba(15, 23, 42, 0.03), 0 2px 12px 0 rgba(15, 23, 42, 0.04)',
  },

  font: {
    family: "'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // System mono stack — used for addresses, hashes, seeds, block numbers, ENS amounts in tables.
    // Drop Satoshi (not a monospace font); fall back to whatever the OS provides.
    mono: "'JetBrains Mono', 'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, monospace",
    size: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '15px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '32px',
      '4xl': '40px',
      '5xl': '56px',
      '6xl': '64px',
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '64px',
    '7xl': '80px',
    '8xl': '96px',
    '9xl': '112px',
  },

  transition: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },

  // Motion tokens for orchestrated animations. Prefer over `transition.*` in new code.
  motion: {
    in: '200ms ease-out',
    inFast: '120ms ease-out',
    out: '160ms ease-in',
  },

  maxWidth: {
    xs: '360px',
    sm: '440px',
    md: '520px',
    lg: '640px',
    xl: '768px',
    '2xl': '960px',
    '3xl': '1200px',
    section: '1120px',
    container: '1440px',
  },
} as const
