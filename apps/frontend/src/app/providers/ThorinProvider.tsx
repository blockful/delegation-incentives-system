import type { ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'
import { ThorinGlobalStyles, lightTheme } from '@ensdomains/thorin'

export function ThorinProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <ThorinGlobalStyles />
      {children}
    </ThemeProvider>
  )
}
