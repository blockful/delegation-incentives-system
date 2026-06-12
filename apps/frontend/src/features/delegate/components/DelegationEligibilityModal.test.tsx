import { beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { renderApp, userEvent } from '@/test/utils'
import { server } from '@/test/mocks/server'
import {
  DelegationEligibilityModal,
  UNISWAP_BUY_ENS_URL,
} from './DelegationEligibilityModal'

// Thorin's Modal restores the page scroll position on unmount; jsdom doesn't
// implement window.scroll and logs a noisy "Not implemented" error.
beforeAll(() => {
  vi.stubGlobal('scroll', vi.fn())
})

function installRelayerConfig(minVotingPower: string) {
  server.use(
    http.get('/api/gateful/ens/relay/balance', () =>
      HttpResponse.json({ hasEnoughBalance: true }),
    ),
    http.get('/api/gateful/ens/relay/config', () =>
      HttpResponse.json({ minVotingPower, maxRelayPerAddressPerDay: 5 }),
    ),
  )
}

describe('DelegationEligibilityModal', () => {
  it('below-minimum: explains the sponsorship threshold from the relayer config', async () => {
    // Non-default threshold proves the copy interpolates the relayer's
    // dynamic minVotingPower instead of the hardcoded fallback.
    installRelayerConfig('50000000000000000000')

    renderApp(
      <DelegationEligibilityModal
        open
        reason="below-minimum"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    expect(
      screen.getByText("Delegation isn't gas-free for this wallet"),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/holding at least\s*50 ENS/),
      ).toBeInTheDocument()
    })
    // Gas-sponsorship only — copy must not tie rewards to the threshold.
    expect(
      screen.getByText(/this only affects gas, not your reward eligibility/i),
    ).toBeInTheDocument()
  })

  it('no-ens: explains the wallet holds no ENS and that the choice persists on-chain', () => {
    renderApp(
      <DelegationEligibilityModal
        open
        reason="no-ens"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    expect(
      screen.getByText(/doesn't hold any ENS/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /applies automatically to any ENS this wallet receives later/i,
      ),
    ).toBeInTheDocument()
  })

  it('falls back to the default 100 ENS threshold when the relayer is unavailable', () => {
    server.use(
      http.get('/api/gateful/ens/relay/balance', () =>
        HttpResponse.json({ hasEnoughBalance: false }),
      ),
    )

    renderApp(
      <DelegationEligibilityModal
        open
        reason="below-minimum"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    expect(screen.getByText(/holding at least\s*100 ENS/)).toBeInTheDocument()
  })

  it('Buy ENS opens the Uniswap ENS swap in a new tab', () => {
    renderApp(
      <DelegationEligibilityModal
        open
        reason="below-minimum"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    const buyLink = screen.getByRole('link', { name: 'Buy ENS' })
    expect(buyLink).toHaveAttribute('href', UNISWAP_BUY_ENS_URL)
    expect(buyLink).toHaveAttribute('target', '_blank')
    expect(buyLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('"Delegate and pay gas" hands off to the regular delegation flow', async () => {
    const onDelegateAnyway = vi.fn()
    const user = userEvent.setup()

    renderApp(
      <DelegationEligibilityModal
        open
        reason="no-ens"
        onClose={() => {}}
        onDelegateAnyway={onDelegateAnyway}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Delegate and pay gas' }),
    )
    expect(onDelegateAnyway).toHaveBeenCalledTimes(1)
  })

  it('close icon dismisses the modal', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderApp(
      <DelegationEligibilityModal
        open
        reason="below-minimum"
        onClose={onClose}
        onDelegateAnyway={() => {}}
      />,
    )

    await user.click(screen.getByTestId('close-icon'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    renderApp(
      <DelegationEligibilityModal
        open={false}
        reason="below-minimum"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    expect(
      screen.queryByText("Delegation isn't gas-free for this wallet"),
    ).not.toBeInTheDocument()
  })
})
