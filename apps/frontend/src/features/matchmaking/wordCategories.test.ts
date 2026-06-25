import type { PoolWord } from '@/api'
import {
  CATEGORY_ORDER,
  WORD_CATEGORY,
  groupPoolByCategory,
} from './wordCategories'

// The 20 canonical pool ids the frontend consumes (mirrors the backend
// WORD_POOL / mock fixture). If the pool changes, this list + the map update
// together — the coverage test below is the guard.
const POOL_IDS = [
  'security',
  'cost_efficiency',
  'growth_investment',
  'decentralization',
  'public_goods_funding',
  'transparency',
  'credible_neutrality',
  'censorship_resistance',
  'user_privacy',
  'developer_experience',
  'treasury_growth',
  'community_governance',
  'protocol_simplicity',
  'long_term_vision',
  'ecosystem_funding',
  'self_custody',
  'open_source',
  'accessibility',
  'sustainability',
  'interoperability',
] as const

const pool: PoolWord[] = POOL_IDS.map((id) => ({ id, label: id }))

describe('WORD_CATEGORY map', () => {
  it('covers every pool id with a known category', () => {
    for (const id of POOL_IDS) {
      expect(WORD_CATEGORY[id]).toBeDefined()
      expect(CATEGORY_ORDER).toContain(WORD_CATEGORY[id])
    }
  })

  it('maps all 20 words and only known categories', () => {
    const ids = Object.keys(WORD_CATEGORY)
    expect(ids).toHaveLength(20)
    for (const cat of Object.values(WORD_CATEGORY)) {
      expect(CATEGORY_ORDER).toContain(cat)
    }
  })

  it('matches the canonical PRD 5-5-5-5 split (ClickUp 86aj53bjc §1)', () => {
    const byCategory = (cat: (typeof CATEGORY_ORDER)[number]) =>
      new Set(
        Object.entries(WORD_CATEGORY)
          .filter(([, c]) => c === cat)
          .map(([id]) => id),
      )

    expect(byCategory('Security & Trust')).toEqual(
      new Set(['security', 'user_privacy', 'self_custody', 'censorship_resistance', 'credible_neutrality']),
    )
    expect(byCategory('Funding & Treasury')).toEqual(
      new Set(['public_goods_funding', 'ecosystem_funding', 'growth_investment', 'treasury_growth', 'cost_efficiency']),
    )
    expect(byCategory('Governance & Process')).toEqual(
      new Set(['decentralization', 'transparency', 'community_governance', 'long_term_vision', 'accessibility']),
    )
    expect(byCategory('Technology & Ecosystem')).toEqual(
      new Set(['developer_experience', 'protocol_simplicity', 'open_source', 'interoperability', 'sustainability']),
    )
  })
})

describe('groupPoolByCategory', () => {
  it('returns the 4 categories in spec order', () => {
    const groups = groupPoolByCategory(pool)
    expect(groups.map((g) => g.category)).toEqual([
      'Security & Trust',
      'Funding & Treasury',
      'Governance & Process',
      'Technology & Ecosystem',
    ])
  })

  it('places every word exactly once across the groups', () => {
    const groups = groupPoolByCategory(pool)
    const grouped = groups.flatMap((g) => g.words.map((w) => w.id))
    expect(grouped).toHaveLength(POOL_IDS.length)
    expect(new Set(grouped).size).toBe(POOL_IDS.length)
  })

  it('preserves the incoming pool order within a category', () => {
    const groups = groupPoolByCategory(pool)
    const security = groups.find((g) => g.category === 'Security & Trust')!
    // Order follows POOL_IDS, filtered to the Security & Trust members.
    expect(security.words.map((w) => w.id)).toEqual([
      'security',
      'credible_neutrality',
      'censorship_resistance',
      'user_privacy',
      'self_custody',
    ])
  })

  it('groups the full pool into a 5-5-5-5 split', () => {
    const groups = groupPoolByCategory(pool)
    expect(groups.map((g) => g.words.length)).toEqual([5, 5, 5, 5])
  })

  it('drops empty categories rather than rendering a bare heading', () => {
    const groups = groupPoolByCategory([{ id: 'security', label: 'Security' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('Security & Trust')
  })

  it('keeps an unknown id visible under the fallback (last) category', () => {
    const groups = groupPoolByCategory([{ id: 'mystery_word', label: 'Mystery' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe(CATEGORY_ORDER[CATEGORY_ORDER.length - 1])
    expect(groups[0].words[0].id).toBe('mystery_word')
  })
})
