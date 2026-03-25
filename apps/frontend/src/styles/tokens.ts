/**
 * Design tokens aligned with ENS brand guidelines.
 * All colors sourced from https://ens.domains/brand#guidelines
 */
export const tokens = {
  color: {
    // Primary
    blue: '#5298FF',
    lightBlue: '#EFF6FF',
    lightBlueOpacity: 'rgb(81 153 255 / 12%)',
    darkBlue: '#1F2328',
    darkGray: '#57606A',
    middleGray: '#D0D7DE',
    gray: '#D0D7DE',
    white: '#fff',

    // Extended
    green: '#007C23',
    magenta: '#F53293',
    yellow: '#FFF72F',
    darkBrown: '#674D49',
    lightGreen: '#C5DDCC',
    lightMagenta: '#F2C4DA',
    lightYellow: '#F8F6D6',
    midnightBlue: '#093C52',

    // Semantic
    text: '#011A25',
    textMuted: '#4A5C63',
    textFaint: '#C4C7C8',
    border: '#E5E5E5',
    surface: '#fff',
    surfaceAlt: '#f6f6f6',
    negative: '#F53293',
    positive: '#007C23',
    accent: '#0080BC',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    pill: '9999px',
  },

  shadow: {
    sm: '0 1px 4px rgba(1, 26, 37, 0.04)',
    md: '0 2px 12px rgba(1, 26, 37, 0.08)',
    lg: '0 8px 32px rgba(1, 26, 37, 0.12)',
  },

  font: {
    family: "'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "'EB Garamond', 'Georgia', serif",
    mono: "'Satoshi', monospace",
    size: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '15px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '28px',
      '4xl': '36px',
      '5xl': '48px',
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

  maxWidth: {
    xs: '360px',
    sm: '440px',
    md: '520px',
    lg: '640px',
    xl: '768px',
    '2xl': '960px',
    '3xl': '1200px',
    container: '1440px',
  },
} as const
