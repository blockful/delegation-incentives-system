import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThorinProvider } from '@/app/providers/ThorinProvider'
import { WalletStateContext } from '@/features/wallet/WalletStateProvider'
import type { AppWalletState } from '@/features/wallet/wallet.types'

interface TestRenderOptions extends RenderOptions {
  walletState?: AppWalletState
  initialPath?: string
}

export function renderApp(
  ui: ReactElement,
  {
    walletState = { status: 'disconnected' },
    initialPath = '/',
    ...options
  }: TestRenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <ThorinProvider>
          <WalletStateContext.Provider value={walletState}>
            {ui}
          </WalletStateContext.Provider>
        </ThorinProvider>
      </MemoryRouter>
    </QueryClientProvider>,
    options,
  )
}

export { default as userEvent } from '@testing-library/user-event'
