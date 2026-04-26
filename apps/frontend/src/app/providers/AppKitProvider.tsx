import type { ReactNode } from 'react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { mainnet } from '@reown/appkit/networks'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { env } from '@/config/env'

const projectId = env.reownProjectId
const queryClient = new QueryClient()
const wagmiAdapter = new WagmiAdapter({ networks: [mainnet], projectId })

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#0080BC' },
})

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
