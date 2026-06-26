import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderApp, userEvent } from '@/test/utils'
import { DelegateShareModal, DELEGATE_TWEET_TEXT } from './DelegateShareModal'

const ADDRESS = '0xabc0000000000000000000000000000000000001'

// Thorin/Modal restore scroll on unmount; jsdom doesn't implement window.scroll.
beforeAll(() => {
  vi.stubGlobal('scroll', vi.fn())
})

describe('DelegateShareModal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the headline and the pre-filled post', () => {
    renderApp(
      <DelegateShareModal open onClose={() => {}} address={ADDRESS} ensName="nick.eth" />,
    )
    expect(screen.getByText('Your delegate profile is live')).toBeInTheDocument()
    expect(screen.getByText(DELEGATE_TWEET_TEXT)).toBeInTheDocument()
  })

  it('opens an x.com intent carrying the profile URL when sharing', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderApp(
      <DelegateShareModal open onClose={() => {}} address={ADDRESS} ensName="nick.eth" />,
    )

    await userEvent.click(screen.getByRole('button', { name: /share on x/i }))

    expect(openSpy).toHaveBeenCalledOnce()
    const url = String(openSpy.mock.calls[0]?.[0])
    expect(url).toContain('x.com/intent/post')
    // url + text are encoded; decode the whole thing to assert on contents.
    const decoded = decodeURIComponent(url)
    expect(decoded).toContain('/voters/nick.eth')
    expect(decoded).toContain('active voter on ENS governance')
  })

  it('does not render its content when closed', () => {
    renderApp(
      <DelegateShareModal open={false} onClose={() => {}} address={ADDRESS} ensName="nick.eth" />,
    )
    expect(screen.queryByText('Your delegate profile is live')).not.toBeInTheDocument()
  })
})
