import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { SelectionFlow } from './SelectionFlow'

const CONNECTED = {
  status: 'connected',
  address: '0x1234567890abcdef1234567890abcdef12345678',
} as const

describe('SelectionFlow', () => {
  it('walks pitch → select → confirm and enables Submit only at 5', async () => {
    const user = userEvent.setup()
    renderApp(<SelectionFlow open role="holder" onClose={() => {}} />, {
      walletState: CONNECTED,
    })

    // Pitch (holder copy)
    expect(
      screen.getByText(/find delegates who share your priorities/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /select values/i }))

    // Select: chips from the word-pool fixture
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ENS Adoption' })).toBeInTheDocument(),
    )

    const submit = () => screen.getByRole('button', { name: /submit/i })
    expect(submit()).toBeDisabled()

    for (const label of [
      'ENS Adoption',
      'ENS User Experience',
      'Public Goods Funding',
      'Governance Transparency',
      'ENSv2',
    ]) {
      await user.click(screen.getByRole('button', { name: label }))
    }

    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(submit()).toBeEnabled()
    await user.click(submit())

    // Confirm
    await waitFor(() =>
      expect(screen.getByText(/the voters list is now sorted/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /view matches/i })).toBeInTheDocument()
  })

  it('caps selection at 5 — extra chips are disabled', async () => {
    const user = userEvent.setup()
    renderApp(<SelectionFlow open role="holder" onClose={() => {}} initialStep="select" />, {
      walletState: CONNECTED,
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ENS Adoption' })).toBeInTheDocument(),
    )
    for (const label of [
      'ENS Adoption',
      'ENS User Experience',
      'Public Goods Funding',
      'Governance Transparency',
      'ENSv2',
    ]) {
      await user.click(screen.getByRole('button', { name: label }))
    }
    // A 6th, unselected chip is now disabled.
    expect(screen.getByRole('button', { name: 'Decentralization & Resilience' })).toBeDisabled()
  })

  it('shows delegate-specific pitch copy', () => {
    renderApp(<SelectionFlow open role="delegate" onClose={() => {}} />, {
      walletState: CONNECTED,
    })
    expect(screen.getByText(/tell holders what you stand for/i)).toBeInTheDocument()
  })
})
