import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/utils'
import { TransparencyPage } from '.'

// ContractLiveness uses wagmi's usePublicClient, which throws without a
// WagmiProvider in the tree. The global setup mock (src/test/mocks/wagmi.ts)
// already stubs useEnsName/useEnsAvatar/useAccount/useDisconnect — extend it
// here with usePublicClient. ContractLiveness handles `undefined` by staying
// in its "Checking…" state.
vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi')
  return {
    ...actual,
    useEnsName: vi.fn().mockReturnValue({ data: null }),
    useEnsAvatar: vi.fn().mockReturnValue({ data: null }),
    useAccount: vi.fn().mockReturnValue({ address: undefined, isConnected: false }),
    useDisconnect: vi.fn().mockReturnValue({ disconnect: vi.fn() }),
    usePublicClient: vi.fn().mockReturnValue(undefined),
  }
})

describe('TransparencyPage', () => {
  it('renders heading', () => {
    renderApp(<TransparencyPage />)
    expect(
      screen.getByText('Verify everything onchain'),
    ).toBeInTheDocument()
  })

  it('renders 3 verify links', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('GitHub repo')).toBeInTheDocument()
    expect(screen.getByText('Anticapture')).toBeInTheDocument()
    expect(screen.getByText('RFC & specs')).toBeInTheDocument()
  })

  it('renders the methodology section with all 4 steps', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('Methodology')).toBeInTheDocument()
    expect(
      screen.getByText('How rewards are computed'),
    ).toBeInTheDocument()
    expect(screen.getByText('1. Balance check')).toBeInTheDocument()
    expect(screen.getByText('2. Your share')).toBeInTheDocument()
    expect(screen.getByText('3. The pool')).toBeInTheDocument()
    expect(screen.getByText('4. You earn')).toBeInTheDocument()
  })
})
