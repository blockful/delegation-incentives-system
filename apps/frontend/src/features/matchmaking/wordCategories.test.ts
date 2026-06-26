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
  'ens_adoption',
  'user_experience',
  'community_onboarding',
  'education_literacy',
  'ecosystem_integrations',
  'ensv2',
  'fair_pricing',
  'name_ownership_rights',
  'decentralization_resilience',
  'service_provider_quality',
  'financial_sustainability',
  'treasury_stewardship',
  'cost_efficiency',
  'protocol_first_funding',
  'public_goods_funding',
  'accountability_reporting',
  'operational_execution',
  'governance_transparency',
  'clear_governance_process',
  'long_term_strategy',
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

    expect(byCategory('Growth & Adoption')).toEqual(
      new Set(['ens_adoption', 'user_experience', 'community_onboarding', 'education_literacy', 'ecosystem_integrations']),
    )
    expect(byCategory('Protocol & Product')).toEqual(
      new Set(['ensv2', 'fair_pricing', 'name_ownership_rights', 'decentralization_resilience', 'service_provider_quality']),
    )
    expect(byCategory('Funding & Treasury')).toEqual(
      new Set(['financial_sustainability', 'treasury_stewardship', 'cost_efficiency', 'protocol_first_funding', 'public_goods_funding']),
    )
    expect(byCategory('Governance & Accountability')).toEqual(
      new Set(['accountability_reporting', 'operational_execution', 'governance_transparency', 'clear_governance_process', 'long_term_strategy']),
    )
  })
})

describe('groupPoolByCategory', () => {
  it('returns the 4 categories in spec order', () => {
    const groups = groupPoolByCategory(pool)
    expect(groups.map((g) => g.category)).toEqual([
      'Growth & Adoption',
      'Protocol & Product',
      'Funding & Treasury',
      'Governance & Accountability',
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
    const growth = groups.find((g) => g.category === 'Growth & Adoption')!
    // Order follows POOL_IDS, filtered to the Growth & Adoption members.
    expect(growth.words.map((w) => w.id)).toEqual([
      'ens_adoption',
      'user_experience',
      'community_onboarding',
      'education_literacy',
      'ecosystem_integrations',
    ])
  })

  it('groups the full pool into a 5-5-5-5 split', () => {
    const groups = groupPoolByCategory(pool)
    expect(groups.map((g) => g.words.length)).toEqual([5, 5, 5, 5])
  })

  it('drops empty categories rather than rendering a bare heading', () => {
    const groups = groupPoolByCategory([{ id: 'ens_adoption', label: 'ENS Adoption' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe('Growth & Adoption')
  })

  it('keeps an unknown id visible under the fallback (last) category', () => {
    const groups = groupPoolByCategory([{ id: 'mystery_word', label: 'Mystery' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].category).toBe(CATEGORY_ORDER[CATEGORY_ORDER.length - 1])
    expect(groups[0].words[0].id).toBe('mystery_word')
  })
})
