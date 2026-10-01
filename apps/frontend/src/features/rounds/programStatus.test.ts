import { endedRoundListFixture, roundListFixture } from '@/test/mocks/fixtures'
import { isProgramEnded, resolveProgramEnded, summarizePilot } from './programStatus'

const AFTER_LAST_ROUND = Date.parse('2026-10-01T12:00:00.000Z')

describe('isProgramEnded', () => {
  it('is true when there is no current round and every round is settled and past', () => {
    expect(isProgramEnded(endedRoundListFixture, AFTER_LAST_ROUND)).toBe(true)
  })

  it('is false while a round is current', () => {
    expect(isProgramEnded(roundListFixture, AFTER_LAST_ROUND)).toBe(false)
  })

  it('is false before the last round has ended', () => {
    expect(
      isProgramEnded(endedRoundListFixture, Date.parse('2026-09-30T12:00:00.000Z')),
    ).toBe(false)
  })

  it('is false when a round is still upcoming', () => {
    const list = {
      ...endedRoundListFixture,
      rounds: [
        { ...endedRoundListFixture.rounds[0], status: 'upcoming' as const },
        ...endedRoundListFixture.rounds.slice(1),
      ],
    }
    expect(isProgramEnded(list, AFTER_LAST_ROUND)).toBe(false)
  })

  it('is false for an empty or missing list', () => {
    expect(isProgramEnded({ currentRoundNumber: null, rounds: [] })).toBe(false)
    expect(isProgramEnded(null)).toBe(false)
  })
})

describe('resolveProgramEnded', () => {
  it('prefers the explicit backend flag', () => {
    expect(resolveProgramEnded(false, endedRoundListFixture)).toBe(false)
    expect(resolveProgramEnded(true, roundListFixture)).toBe(true)
  })

  it('derives from /rounds when the flag is absent', () => {
    expect(resolveProgramEnded(undefined, endedRoundListFixture)).toBe(true)
    expect(resolveProgramEnded(undefined, roundListFixture)).toBe(false)
  })
})

describe('summarizePilot', () => {
  it('sums distributed ENS and picks the last round tier', () => {
    expect(summarizePilot(endedRoundListFixture.rounds)).toEqual({
      roundCount: 3,
      totalDistributedEns: 18000,
      finalTierIndex: 1,
    })
  })
})
