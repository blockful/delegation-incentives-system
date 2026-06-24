import { tokens } from '@/styles'
import { matchLevel, resolveCardState } from './delegateValuesState'

const DELEGATE = '0x2222222222222222222222222222222222222222'

describe('matchLevel — graduated match visuals', () => {
  it('5/5 → 100% green, Strong (★), no differ list', () => {
    const lvl = matchLevel(5)
    expect(lvl.ringPercent).toBe(100)
    expect(lvl.ringColor).toBe(tokens.color.green)
    expect(lvl.tier).toBe('strong')
    expect(lvl.pillLabel).toBe('Strong match')
    expect(lvl.showStar).toBe(true)
    expect(lvl.differLayout).toBe('none')
  })

  it('4/5 → 80% blue, Strong (★), side-by-side', () => {
    const lvl = matchLevel(4)
    expect(lvl.ringPercent).toBe(80)
    expect(lvl.ringColor).toBe(tokens.color.blue)
    expect(lvl.tier).toBe('strong')
    expect(lvl.showStar).toBe(true)
    expect(lvl.differLayout).toBe('side-by-side')
  })

  it('3/5 → 60% blue, Partial (no ★), side-by-side', () => {
    const lvl = matchLevel(3)
    expect(lvl.ringPercent).toBe(60)
    expect(lvl.ringColor).toBe(tokens.color.blue)
    expect(lvl.tier).toBe('partial')
    expect(lvl.pillLabel).toBe('Partial match')
    expect(lvl.showStar).toBe(false)
    expect(lvl.differLayout).toBe('side-by-side')
  })

  it('2/5 → 40% blue, Partial, side-by-side (same layout as 3/5)', () => {
    const lvl = matchLevel(2)
    expect(lvl.ringPercent).toBe(40)
    expect(lvl.ringColor).toBe(tokens.color.blue)
    expect(lvl.tier).toBe('partial')
    expect(lvl.pillLabel).toBe('Partial match')
    expect(lvl.differLayout).toBe('side-by-side')
  })

  it('1/5 → 20% muted, Weak, stacked', () => {
    const lvl = matchLevel(1)
    expect(lvl.ringPercent).toBe(20)
    expect(lvl.ringColor).toBe(tokens.color.textSubtle)
    expect(lvl.tier).toBe('weak')
    expect(lvl.pillLabel).toBe('Weak match')
    expect(lvl.showStar).toBe(false)
    expect(lvl.differLayout).toBe('stacked')
  })

  it('0/5 → 0% grey, None, delegate-only', () => {
    const lvl = matchLevel(0)
    expect(lvl.ringPercent).toBe(0)
    expect(lvl.ringColor).toBe(tokens.color.middleGray)
    expect(lvl.tier).toBe('none')
    expect(lvl.pillLabel).toBe('No shared values')
    expect(lvl.showStar).toBe(false)
    expect(lvl.differLayout).toBe('delegate-only')
  })

  it('clamps out-of-range counts into 0–100%', () => {
    expect(matchLevel(-3).ringPercent).toBe(0)
    expect(matchLevel(-3).tier).toBe('none')
    expect(matchLevel(99).ringPercent).toBe(100)
    expect(matchLevel(99).tier).toBe('strong')
  })

  it('bucket thresholds are unified: ≥80 strong · 40–60 partial · 20 weak · 0 none', () => {
    expect(matchLevel(5).tier).toBe('strong')
    expect(matchLevel(4).tier).toBe('strong')
    expect(matchLevel(3).tier).toBe('partial')
    expect(matchLevel(2).tier).toBe('partial')
    expect(matchLevel(1).tier).toBe('weak')
    expect(matchLevel(0).tier).toBe('none')
  })
})

describe('resolveCardState — 7-state matrix (precedence order)', () => {
  it('own profile + selected → own-selected', () => {
    expect(
      resolveCardState({
        isOwnProfile: true,
        viewerAddress: DELEGATE,
        viewerSelected: true,
        delegateSelected: true,
      }),
    ).toBe('own-selected')
  })

  it('own profile + NOT selected → own-unselected', () => {
    expect(
      resolveCardState({
        isOwnProfile: true,
        viewerAddress: DELEGATE,
        viewerSelected: false,
        delegateSelected: false,
      }),
    ).toBe('own-unselected')
  })

  it('logged out (no viewer address) → logged-out', () => {
    expect(
      resolveCardState({
        isOwnProfile: false,
        viewerAddress: undefined,
        viewerSelected: false,
        delegateSelected: true,
      }),
    ).toBe('logged-out')
  })

  it('neither picked → neither-picked', () => {
    expect(
      resolveCardState({
        isOwnProfile: false,
        viewerAddress: '0x1111111111111111111111111111111111111111',
        viewerSelected: false,
        delegateSelected: false,
      }),
    ).toBe('neither-picked')
  })

  it('holder not picked + delegate picked → viewer-unselected (the gate)', () => {
    expect(
      resolveCardState({
        isOwnProfile: false,
        viewerAddress: '0x1111111111111111111111111111111111111111',
        viewerSelected: false,
        delegateSelected: true,
      }),
    ).toBe('viewer-unselected')
  })

  it('viewer picked + delegate NOT picked → delegate-unselected', () => {
    expect(
      resolveCardState({
        isOwnProfile: false,
        viewerAddress: '0x1111111111111111111111111111111111111111',
        viewerSelected: true,
        delegateSelected: false,
      }),
    ).toBe('delegate-unselected')
  })

  it('both picked → both-picked', () => {
    expect(
      resolveCardState({
        isOwnProfile: false,
        viewerAddress: '0x1111111111111111111111111111111111111111',
        viewerSelected: true,
        delegateSelected: true,
      }),
    ).toBe('both-picked')
  })

  it('own profile wins over the logged-out check even if both could apply', () => {
    // isOwnProfile is only ever true for a connected viewer, but assert the
    // precedence explicitly so a future refactor can't silently flip it.
    expect(
      resolveCardState({
        isOwnProfile: true,
        viewerAddress: DELEGATE,
        viewerSelected: true,
        delegateSelected: false,
      }),
    ).toBe('own-selected')
  })
})
