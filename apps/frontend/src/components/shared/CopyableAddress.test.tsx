import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyableAddress } from './CopyableAddress'

describe('CopyableAddress', () => {
  it('copies the full address while displaying the standard truncated label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const address = '0x1234567890abcdef1234567890abcdef12345678'
    render(<CopyableAddress address={address} showEnsName={false} />)

    await userEvent.click(screen.getByRole('button', { name: `Copy address ${address}` }))

    expect(screen.getByText('0x1234…5678')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(address)
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })
})
