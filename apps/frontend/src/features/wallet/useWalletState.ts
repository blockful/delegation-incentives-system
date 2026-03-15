import { useContext } from 'react'
import { WalletStateContext } from './WalletStateProvider'

export function useWalletState() {
  return useContext(WalletStateContext)
}
