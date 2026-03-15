import { BrowserRouter } from 'react-router-dom'
import { AppKitProvider } from './providers/AppKitProvider'
import { ThorinProvider } from './providers/ThorinProvider'
import { WalletStateProvider } from '@/features/wallet/WalletStateProvider'
import { Router } from './Router'

export function App() {
  return (
    <AppKitProvider>
      <ThorinProvider>
        <BrowserRouter>
          <WalletStateProvider>
            <Router />
          </WalletStateProvider>
        </BrowserRouter>
      </ThorinProvider>
    </AppKitProvider>
  )
}
