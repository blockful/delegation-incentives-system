import { createContext } from 'react'
import type { AppWalletState } from './wallet.types'

export const WalletStateContext = createContext<AppWalletState>({
  status: 'disconnected',
})
