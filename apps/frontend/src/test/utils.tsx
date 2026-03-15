import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
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
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThorinProvider>
        <WalletStateContext.Provider value={walletState}>
          {ui}
        </WalletStateContext.Provider>
      </ThorinProvider>
    </MemoryRouter>,
    options,
  )
}

export { default as userEvent } from '@testing-library/user-event'
