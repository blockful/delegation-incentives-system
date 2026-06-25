import { isAtMax, progressFill, toggleSelection } from './selectionLogic'

const MAX = 5

describe('progressFill', () => {
  it('is 0 at empty and 1 at the cap', () => {
    expect(progressFill(0, MAX)).toBe(0)
    expect(progressFill(5, MAX)).toBe(1)
  })

  it('tracks the count live as a fraction of max', () => {
    expect(progressFill(1, MAX)).toBeCloseTo(0.2)
    expect(progressFill(3, MAX)).toBeCloseTo(0.6)
    expect(progressFill(4, MAX)).toBeCloseTo(0.8)
  })

  it('clamps to [0, 1] and is safe for max <= 0', () => {
    expect(progressFill(7, MAX)).toBe(1)
    expect(progressFill(-1, MAX)).toBe(0)
    expect(progressFill(2, 0)).toBe(0)
  })
})

describe('isAtMax', () => {
  it('is false below the cap and true at/over it', () => {
    expect(isAtMax(4, MAX)).toBe(false)
    expect(isAtMax(5, MAX)).toBe(true)
    expect(isAtMax(6, MAX)).toBe(true)
  })
})

describe('toggleSelection (at-max gating)', () => {
  it('adds a word while below the cap', () => {
    expect(toggleSelection(['a', 'b'], 'c', MAX)).toEqual(['a', 'b', 'c'])
  })

  it('deselects a word that is already selected', () => {
    expect(toggleSelection(['a', 'b', 'c'], 'b', MAX)).toEqual(['a', 'c'])
  })

  it('cannot select a 6th — returns the same list unchanged at the cap', () => {
    const full = ['a', 'b', 'c', 'd', 'e']
    const next = toggleSelection(full, 'f', MAX)
    expect(next).toEqual(full)
    expect(next).toBe(full) // no-op returns the same reference
  })

  it('can still deselect at the cap (swap path)', () => {
    const full = ['a', 'b', 'c', 'd', 'e']
    expect(toggleSelection(full, 'c', MAX)).toEqual(['a', 'b', 'd', 'e'])
  })
})
