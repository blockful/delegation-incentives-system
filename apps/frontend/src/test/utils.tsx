import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThorinProvider } from '@/app/providers/ThorinProvider'
import { WalletStateContext } from '@/features/wallet/wallet.context'
import type { AppWalletState } from '@/features/wallet/wallet.types'

interface TestRenderOptions extends RenderOptions {
  walletState?: AppWalletState
  initialPath?: string
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

export function TestQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  )
}

export function renderApp(
  ui: ReactElement,
  {
    walletState = { status: 'disconnected' },
    initialPath = '/',
    ...options
  }: TestRenderOptions = {},
) {
  return render(
    <TestQueryProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <ThorinProvider>
          <WalletStateContext.Provider value={walletState}>
            {ui}
          </WalletStateContext.Provider>
        </ThorinProvider>
      </MemoryRouter>
    </TestQueryProvider>,
    options,
  )
}

export { default as userEvent } from '@testing-library/user-event'
