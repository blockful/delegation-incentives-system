import { describe, expect, it } from 'vitest'
import type { MatchScore } from '@ens-dis/domain'
import { tokens } from '@/styles'
import {
  matchBucket,
  voterCardMatchDisplay,
  type MatchBucket,
  type MatchVariant,
} from './voterCardMatch'

/** Build a MatchScore for a given percent (other fields are irrelevant here). */
function score(percent: number, bUnique: string[] = []): MatchScore {
  return {
    percent,
    strongMatch: percent >= 80,
    sharedWords: [],
    aUnique: [],
    bUnique,
  }
}

describe('matchBucket', () => {
  // Selections are 5 words, so percent ∈ {0,20,40,60,80,100}.
  it.each<[number, MatchBucket]>([
    [100, 'strong'],
    [80, 'strong'],
    [60, 'partial'],
    [40, 'partial'],
    [20, 'weak'],
    [0, 'none'],
  ])('buckets %i%% as %s', (percent, expected) => {
    expect(matchBucket(percent)).toBe(expected)
  })

  it('treats the threshold edges inclusively (>=)', () => {
    expect(matchBucket(80)).toBe('strong')
    expect(matchBucket(40)).toBe('partial')
    expect(matchBucket(20)).toBe('weak')
    expect(matchBucket(19)).toBe('none')
  })
})

describe('voterCardMatchDisplay — viewer has selected, delegate has ranked', () => {
  it.each<[number, MatchVariant, string, boolean]>([
    // percent, variant, subtitle, highlight
    [100, 'strong', '⭐ Strong match', true],
    [80, 'strong', '⭐ Strong match', true],
    [60, 'partial', 'Partial match', false],
    [40, 'partial', 'Partial match', false],
    [20, 'weak', 'Weak match', false],
    [0, 'none', 'No shared priorities', false],
  ])(
    'at %i%% → %s subtitle "%s"',
    (percent, variant, subtitle, highlight) => {
      const result = voterCardMatchDisplay({
        match: score(percent),
        viewerHasSelected: true,
        delegateHasRanked: true,
      })
      expect(result.variant).toBe(variant)
      expect(result.subtitle).toBe(subtitle)
      expect(result.statValue).toBe(`${percent}%`)
      expect(result.highlight).toBe(highlight)
    },
  )

  it('only the strong variant highlights the whole card', () => {
    const strong = voterCardMatchDisplay({
      match: score(80),
      viewerHasSelected: true,
      delegateHasRanked: true,
    })
    const partial = voterCardMatchDisplay({
      match: score(60),
      viewerHasSelected: true,
      delegateHasRanked: true,
    })
    expect(strong.highlight).toBe(true)
    expect(partial.highlight).toBe(false)
  })
})

describe('voterCardMatchDisplay — delegate has not ranked', () => {
  it('viewer selected → "didn\'t rank" subtitle with a "–" match stat', () => {
    const result = voterCardMatchDisplay({
      match: null,
      viewerHasSelected: true,
      delegateHasRanked: false,
    })
    expect(result.variant).toBe('unranked')
    expect(result.subtitle).toBe("Delegate didn't rank priorities")
    expect(result.statValue).toBe('–')
    expect(result.highlight).toBe(false)
  })

  it('viewer NOT selected → same "didn\'t rank" subtitle but a "?" match stat', () => {
    const result = voterCardMatchDisplay({
      match: null,
      viewerHasSelected: false,
      delegateHasRanked: false,
    })
    expect(result.variant).toBe('unranked')
    expect(result.subtitle).toBe("Delegate didn't rank priorities")
    expect(result.statValue).toBe('?')
  })
})

describe('voterCardMatchDisplay — holder (viewer) has not picked', () => {
  it('delegate ranked but viewer has not → "Rank to see your match" with "?"', () => {
    const result = voterCardMatchDisplay({
      match: null,
      viewerHasSelected: false,
      delegateHasRanked: true,
    })
    expect(result.variant).toBe('unpicked')
    expect(result.subtitle).toBe('Rank to see your match')
    expect(result.statValue).toBe('?')
    expect(result.highlight).toBe(false)
  })
})

describe('voterCardMatchDisplay — defensive fallback', () => {
  it('both ranked but no score object → treated as "can\'t compute" (–)', () => {
    const result = voterCardMatchDisplay({
      match: null,
      viewerHasSelected: true,
      delegateHasRanked: true,
    })
    expect(result.variant).toBe('unranked')
    expect(result.statValue).toBe('–')
  })

  it('weak variant carries the delegate\'s diverging words through bUnique', () => {
    // (The component reads match.bUnique for the weak differ-list; this just
    // confirms the weak bucket is selected so the component renders it.)
    const result = voterCardMatchDisplay({
      match: score(20, ['public_goods_funding', 'security']),
      viewerHasSelected: true,
      delegateHasRanked: true,
    })
    expect(result.variant).toBe('weak')
  })
})

describe('voterCardMatchDisplay — subtitle colour pre-resolved per variant', () => {
  const both = { viewerHasSelected: true, delegateHasRanked: true }

  it('strong → success foreground, partial → blue', () => {
    expect(voterCardMatchDisplay({ match: score(80), ...both }).color).toBe(
      tokens.color.status.success.fg,
    )
    expect(voterCardMatchDisplay({ match: score(60), ...both }).color).toBe(
      tokens.color.blue,
    )
  })

  it('weak / none / unranked / unpicked all read as muted secondary text', () => {
    const muted = tokens.color.textSecondary
    expect(voterCardMatchDisplay({ match: score(20), ...both }).color).toBe(muted)
    expect(voterCardMatchDisplay({ match: score(0), ...both }).color).toBe(muted)
    expect(
      voterCardMatchDisplay({
        match: null,
        viewerHasSelected: true,
        delegateHasRanked: false,
      }).color,
    ).toBe(muted)
    expect(
      voterCardMatchDisplay({
        match: null,
        viewerHasSelected: false,
        delegateHasRanked: true,
      }).color,
    ).toBe(muted)
  })
})
