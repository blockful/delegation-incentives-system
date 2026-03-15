import { vi } from 'vitest'

vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi')
  return {
    ...actual,
    useEnsName: vi.fn().mockReturnValue({ data: null }),
    useEnsAvatar: vi.fn().mockReturnValue({ data: null }),
    useAccount: vi.fn().mockReturnValue({ address: undefined, isConnected: false }),
    useDisconnect: vi.fn().mockReturnValue({ disconnect: vi.fn() }),
  }
})
