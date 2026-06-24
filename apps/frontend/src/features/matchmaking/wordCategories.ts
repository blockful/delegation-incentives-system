/**
 * Frontend-only grouping for the matchmaking word pool (DEV-938).
 *
 * The backend `word-pool.ts` stays a flat list of 20 — the "category" concept
 * lives purely on the frontend as a presentation aid for the Selection modal.
 * This map covers ALL 20 pool ids; render order follows {@link CATEGORY_ORDER}.
 *
 * If the pool grows/changes server-side, add the new id here (it falls back to
 * the last category if missing — see {@link groupPoolByCategory}).
 */
import type { PoolWord } from '@/api'

export type WordCategory =
  | 'Security & Trust'
  | 'Funding & Treasury'
  | 'Governance & Process'
  | 'Technology & Ecosystem'

/** Heading render order (spec-mandated). */
export const CATEGORY_ORDER: readonly WordCategory[] = [
  'Security & Trust',
  'Funding & Treasury',
  'Governance & Process',
  'Technology & Ecosystem',
]

/** Pool word id → category. Must cover every id in the backend WORD_POOL. */
export const WORD_CATEGORY: Readonly<Record<string, WordCategory>> = {
  // Security & Trust
  security: 'Security & Trust',
  transparency: 'Security & Trust',
  credible_neutrality: 'Security & Trust',
  censorship_resistance: 'Security & Trust',
  user_privacy: 'Security & Trust',
  self_custody: 'Security & Trust',
  // Funding & Treasury
  cost_efficiency: 'Funding & Treasury',
  growth_investment: 'Funding & Treasury',
  public_goods_funding: 'Funding & Treasury',
  treasury_growth: 'Funding & Treasury',
  ecosystem_funding: 'Funding & Treasury',
  // Governance & Process
  decentralization: 'Governance & Process',
  community_governance: 'Governance & Process',
  long_term_vision: 'Governance & Process',
  sustainability: 'Governance & Process',
  // Technology & Ecosystem
  developer_experience: 'Technology & Ecosystem',
  protocol_simplicity: 'Technology & Ecosystem',
  open_source: 'Technology & Ecosystem',
  accessibility: 'Technology & Ecosystem',
  interoperability: 'Technology & Ecosystem',
}

export interface WordGroup {
  category: WordCategory
  words: PoolWord[]
}

/**
 * Group a flat pool into ordered category buckets. Within each bucket, word
 * order follows the incoming `pool` order (the server's canonical order). Empty
 * categories are dropped so a partial/changed pool never renders a bare heading.
 *
 * Any word whose id is missing from {@link WORD_CATEGORY} is placed in the last
 * category so it stays visible/selectable rather than silently disappearing.
 */
export function groupPoolByCategory(pool: readonly PoolWord[]): WordGroup[] {
  const fallback = CATEGORY_ORDER[CATEGORY_ORDER.length - 1]
  const buckets = new Map<WordCategory, PoolWord[]>(
    CATEGORY_ORDER.map((c) => [c, []]),
  )
  for (const word of pool) {
    const category = WORD_CATEGORY[word.id] ?? fallback
    buckets.get(category)!.push(word)
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    words: buckets.get(category)!,
  })).filter((group) => group.words.length > 0)
}
