export type AppWalletState =
  | { status: 'disconnected' }
  | { status: 'connected'; address: `0x${string}` }
  | {
      status: 'delegated'
      address: `0x${string}`
      delegatedTo: `0x${string}`
    }
