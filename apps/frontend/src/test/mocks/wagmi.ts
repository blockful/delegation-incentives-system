import { vi } from 'vitest'
import type { useReadContract, useWalletClient } from 'wagmi'

type ReadContractResult = ReturnType<typeof useReadContract>
type WalletClientResult = ReturnType<typeof useWalletClient>

export function readContractResult(
  overrides: Partial<ReadContractResult> = {},
): ReadContractResult {
  return {
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReadContractResult
}

// Same rationale as `readContractResult`: `useWalletClient` returns a wide
// discriminated query union. Tests only need `data`, so we cast once here.
export function walletClientResult(
  overrides: Partial<WalletClientResult> = {},
): WalletClientResult {
  return {
    data: undefined,
    isLoading: false,
    ...overrides,
  } as WalletClientResult
}

vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi')
  return {
    ...actual,
    useEnsName: vi.fn().mockReturnValue({ data: null }),
    useEnsAvatar: vi.fn().mockReturnValue({ data: null }),
    useEnsAddress: vi.fn().mockReturnValue({ data: null }),
    useAccount: vi.fn().mockReturnValue({ address: undefined, isConnected: false }),
    useDisconnect: vi.fn().mockReturnValue({ disconnect: vi.fn() }),
    useReadContract: vi.fn().mockReturnValue(readContractResult()),
    useWalletClient: vi.fn().mockReturnValue(walletClientResult()),
    useSignMessage: vi.fn().mockReturnValue({
      signMessageAsync: vi.fn().mockResolvedValue('0xsignature'),
      isPending: false,
    }),
    usePublicClient: vi.fn().mockReturnValue({
      getEnsAddress: vi.fn().mockResolvedValue(null),
    }),
  }
})
