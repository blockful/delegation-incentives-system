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
      screen.getByText('You need more ENS for free gas'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/holding at least 50 ENS/),
      ).toBeInTheDocument()
    })
    // Gas-sponsorship only — copy must not tie rewards to the threshold.
    expect(
      screen.getByText(
        /Gas is the only difference and your rewards stay the same/i,
      ),
    ).toBeInTheDocument()
  })

  it('no-ens: uses the Figma copy for the 0-ENS state', () => {
    renderApp(
      <DelegationEligibilityModal
        open
        reason="no-ens"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    expect(screen.getByText('You need some ENS first')).toBeInTheDocument()
    expect(
      screen.getByText(/Your wallet holds 0 ENS, so gas is not sponsored/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Your choice sticks and applies once you hold ENS/),
    ).toBeInTheDocument()
  })

  it('relayer-paused: explains the global pause and offers Maybe later / pay gas', async () => {
    const onClose = vi.fn()
    const onDelegateAnyway = vi.fn()
    const user = userEvent.setup()

    renderApp(
      <DelegationEligibilityModal
        open
        reason="relayer-paused"
        onClose={onClose}
        onDelegateAnyway={onDelegateAnyway}
      />,
    )

    expect(screen.getByText('Sponsored gas is paused')).toBeInTheDocument()
    expect(
      screen.getByText(/your rewards are unaffected/i),
    ).toBeInTheDocument()
    // No Buy ENS action in the paused state — pause isn't balance-gated.
    expect(
      screen.queryByRole('link', { name: 'Buy ENS' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Maybe later' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(
      screen.getByRole('button', { name: 'Delegate and pay gas' }),
    )
    expect(onDelegateAnyway).toHaveBeenCalledTimes(1)
  })

  it('rate-limited: explains the monthly allowance and offers Maybe later / pay gas, no Buy ENS', async () => {
    const onClose = vi.fn()
    const onDelegateAnyway = vi.fn()
    const user = userEvent.setup()

    renderApp(
      <DelegationEligibilityModal
        open
        reason="rate-limited"
        onClose={onClose}
        onDelegateAnyway={onDelegateAnyway}
      />,
    )

    expect(
      screen.getByText('No free delegations left this month'),
    ).toBeInTheDocument()
    expect(screen.getByText(/your rewards are unaffected/i)).toBeInTheDocument()
    // Buying ENS wouldn't lift a rate limit — no Buy ENS action here.
    expect(
      screen.queryByRole('link', { name: 'Buy ENS' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Maybe later' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(
      screen.getByRole('button', { name: 'Delegate and pay gas' }),
    )
    expect(onDelegateAnyway).toHaveBeenCalledTimes(1)
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

    expect(screen.getByText(/holding at least 100 ENS/)).toBeInTheDocument()
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

  it('stacks the secondary action above the primary, per the Figma frames', () => {
    renderApp(
      <DelegationEligibilityModal
        open
        reason="no-ens"
        onClose={() => {}}
        onDelegateAnyway={() => {}}
      />,
    )

    const secondary = screen.getByRole('button', {
      name: 'Delegate and pay gas',
    })
    const primary = screen.getByRole('link', { name: 'Buy ENS' })
    expect(
      secondary.compareDocumentPosition(primary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
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
      screen.queryByText('You need more ENS for free gas'),
    ).not.toBeInTheDocument()
  })
})
