import { screen, waitFor } from '@testing-library/react'
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
      screen.getByText('Verify everything on-chain'),
    ).toBeInTheDocument()
  })

  it('renders 3 verify links', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Anticapture')).toBeInTheDocument()
    expect(screen.getByText('Dune Analytics')).toBeInTheDocument()
  })

  it('renders 3 smart contracts with Verified badges', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('ENS Incentives')).toBeInTheDocument()
    expect(screen.getByText('Delegate By Sig')).toBeInTheDocument()
    expect(screen.getByText('Reward Distributor')).toBeInTheDocument()

    const verifiedTags = screen.getAllByText('Verified')
    expect(verifiedTags).toHaveLength(3)
  })

  it('renders the algorithm methodology diagram with all 4 steps', async () => {
    renderApp(<TransparencyPage />)
    expect(
      screen.getByText('How Rewards Are Calculated'),
    ).toBeInTheDocument()
    expect(screen.getByText('Algorithm')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Snapshot balances step/i }),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /Compute shares step/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Apply tier APR step/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Distribute step/i }),
    ).toBeInTheDocument()
  })
})
