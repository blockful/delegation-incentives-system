import { describe, it, expect } from 'vitest'
import { buildVoterShareUrl, buildHolderShareUrl, buildVoterOgImageUrl } from './shareCard'

const ORIGIN = window.location.origin

describe('buildVoterShareUrl', () => {
  it('prefers the ENS name over the address', () => {
    expect(
      buildVoterShareUrl({
        address: '0xabc0000000000000000000000000000000000001',
        ensName: 'nick.eth',
      }),
    ).toBe(`${ORIGIN}/voters/nick.eth`)
  })

  it('falls back to the address when there is no ENS name', () => {
    expect(
      buildVoterShareUrl({ address: '0xABC0000000000000000000000000000000000001' }),
    ).toBe(`${ORIGIN}/voters/0xABC0000000000000000000000000000000000001`)
  })
})

describe('buildHolderShareUrl', () => {
  it('builds the holder share path, preferring the ENS name', () => {
    expect(
      buildHolderShareUrl({
        address: '0xabc0000000000000000000000000000000000001',
        ensName: 'nick.eth',
      }),
    ).toBe(`${ORIGIN}/share/holder/nick.eth`)
  })

  it('falls back to the address when there is no ENS name', () => {
    expect(
      buildHolderShareUrl({ address: '0xABC0000000000000000000000000000000000001' }),
    ).toBe(`${ORIGIN}/share/holder/0xABC0000000000000000000000000000000000001`)
  })
})

describe('buildVoterOgImageUrl', () => {
  it('passes the ENS name + variant so the renderer can fetch the avatar', () => {
    const url = buildVoterOgImageUrl({
      address: '0xabc',
      ensName: 'nick.eth',
      variant: 'delegate',
    })
    expect(url.startsWith(`${ORIGIN}/api/og/voter?`)).toBe(true)
    expect(url).toContain('variant=delegate')
    expect(url).toContain('name=nick.eth')
  })

  it('falls back to the address when no ENS name', () => {
    const url = buildVoterOgImageUrl({ address: '0xABC' })
    expect(url).toContain('address=0xABC')
    expect(url).toContain('variant=delegate')
  })

  it('supports the holder variant', () => {
    expect(
      buildVoterOgImageUrl({ address: '0xabc', ensName: 'x.eth', variant: 'holder' }),
    ).toContain('variant=holder')
  })
})
