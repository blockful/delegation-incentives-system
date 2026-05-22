import { describe, expect, it } from 'vitest'
import { looksLikeEnsName } from './ens'

describe('looksLikeEnsName', () => {
  it.each([
    ['nick.eth', true],
    ['sub.nick.eth', true],
    ['NICK.ETH', true],
    [' nick.eth ', true],
    ['vitalik.base.eth', true],
  ])('returns true for ENS-shaped input %s', (input, expected) => {
    expect(looksLikeEnsName(input)).toBe(expected)
  })

  it.each([
    ['', false],
    ['nick', false],
    ['0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', false],
    ['0Xabc.eth', false],
    ['nick .eth', false],
    ['nick.eth foo', false],
    ['.eth', false],
    ['nick.', false],
    ['.', false],
  ])('returns false for non-ENS input %s', (input, expected) => {
    expect(looksLikeEnsName(input)).toBe(expected)
  })
})
