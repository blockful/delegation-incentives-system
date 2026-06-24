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
    // security appears before transparency in POOL_IDS → same order in-group
    expect(security.words.map((w) => w.id)).toEqual([
      'security',
      'transparency',
      'credible_neutrality',
      'censorship_resistance',
      'user_privacy',
      'self_custody',
    ])
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
