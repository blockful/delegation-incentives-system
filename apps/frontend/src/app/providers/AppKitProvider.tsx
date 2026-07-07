import type { ReactNode } from 'react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { mainnet } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { env } from '@/config/env'
import { WalletStateProvider } from '@/features/wallet/WalletStateProvider'

const projectId = env.reownProjectId
const queryClient = new QueryClient()
const wagmiAdapter = new WagmiAdapter({ networks: [mainnet], projectId })

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#0080BC' },
  // ENS asked us to remove the Meld.io on-ramp from the fund-wallet flow;
  // swaps (1inch) is disabled for the same reason. Our Reown project has no
  // remote feature config (config: null), so these local flags are what the
  // SDK actually applies.
  features: { onramp: false, swaps: false },
})

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletStateProvider>{children}</WalletStateProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
