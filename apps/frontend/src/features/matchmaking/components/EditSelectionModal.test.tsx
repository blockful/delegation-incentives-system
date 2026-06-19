import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { EditSelectionModal } from './EditSelectionModal'

const CONNECTED = {
  status: 'connected',
  address: '0x1234567890abcdef1234567890abcdef12345678',
} as const

describe('EditSelectionModal', () => {
  it('prefills the stored selection (5/5) and saves an edit', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderApp(<EditSelectionModal open onClose={() => {}} onSaved={onSaved} />, {
      walletState: CONNECTED,
    })

    // Prefilled from the wallet's stored selection (msw fixture = 5 words).
    await waitFor(() => expect(screen.getByText('5/5')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Security' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Swap one word out and another in.
    await user.click(screen.getByRole('button', { name: 'Security' }))
    expect(screen.getByText('4/5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Credible neutrality' }))
    expect(screen.getByText('5/5')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('disables Save below 5 words', async () => {
    const user = userEvent.setup()
    renderApp(<EditSelectionModal open onClose={() => {}} />, { walletState: CONNECTED })

    await waitFor(() => expect(screen.getByText('5/5')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Security' })) // → 4/5
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
})
