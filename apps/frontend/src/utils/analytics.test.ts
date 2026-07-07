import { errorMessageForAnalytics } from './analytics'

describe('errorMessageForAnalytics', () => {
  it('scrubs wallet addresses embedded in wallet error messages', () => {
    const err = new Error(
      'Transaction failed. Request Arguments: from: 0x911893036886996b966621aD0baEab9F33dcb29f to: 0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
    )
    const out = errorMessageForAnalytics(err)
    expect(out).not.toMatch(/0x[a-fA-F0-9]{40}/)
    expect(out).toContain('from: 0x…')
  })

  it('scrubs tx hashes', () => {
    const err = new Error(
      'Timed out waiting for 0x866393bbe6009b9a67c310c516dd4493c60c951c18129eab74b9bad2cc7560de',
    )
    expect(errorMessageForAnalytics(err)).toBe('Timed out waiting for 0x…')
  })

  it('scrubs before truncating, so an address cannot survive at the cut edge', () => {
    const err = new Error(
      `${'x'.repeat(150)} 0x911893036886996b966621aD0baEab9F33dcb29f`,
    )
    expect(errorMessageForAnalytics(err)).not.toMatch(/0x[a-fA-F0-9]{10}/)
  })

  it('truncates to 160 chars and stringifies non-Error input', () => {
    expect(errorMessageForAnalytics('a'.repeat(300))).toHaveLength(160)
    expect(errorMessageForAnalytics(42)).toBe('42')
  })

  it('leaves ordinary messages untouched', () => {
    expect(errorMessageForAnalytics(new Error('User rejected the request.'))).toBe(
      'User rejected the request.',
    )
  })
})
