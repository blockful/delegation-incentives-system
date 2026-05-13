import { useContext } from 'react'
import { WalletStateContext } from './wallet.context'

export function useWalletState() {
  return useContext(WalletStateContext)
}
