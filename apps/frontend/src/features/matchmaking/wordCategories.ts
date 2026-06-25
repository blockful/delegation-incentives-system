/**
 * Frontend-only grouping for the matchmaking word pool (DEV-938).
 *
 * The backend `word-pool.ts` stays a flat list of 20 — the "category" concept
 * lives purely on the frontend as a presentation aid for the Selection modal.
 *
 * Authoring shape mirrors the PRD §1 table (category → its 5 words) so the
 * 5-5-5-5 split is verifiable at a glance. Everything else is DERIVED from it:
 *   - {@link WordCategory}  — the category union (keys of the table)
 *   - {@link CATEGORY_ORDER} — heading order (table's insertion order)
 *   - {@link WORD_CATEGORY}  — the word→category lookup the grouping uses
 *
 * If the pool grows/changes server-side, add the new id to the right bucket
 * below — a single source of truth. An id missing from every bucket falls back
 * to the last category so it stays visible (see {@link groupPoolByCategory}).
 */
import type { PoolWord } from '@/api'

/**
 * Canonical category → pool-word-ids, per the matchmaking PRD §1
 * (ClickUp 86aj53bjc). This is the SINGLE SOURCE OF TRUTH — do not re-derive
 * the buckets by intuition, and do not maintain a parallel list elsewhere.
 */
export const CATEGORY_WORDS = {
  'Security & Trust': [
    'security',
    'user_privacy',
    'self_custody',
    'censorship_resistance',
    'credible_neutrality',
  ],
  'Funding & Treasury': [
    'public_goods_funding',
    'ecosystem_funding',
    'growth_investment',
    'treasury_growth',
    'cost_efficiency',
  ],
  'Governance & Process': [
    'decentralization',
    'transparency',
    'community_governance',
    'long_term_vision',
    'accessibility',
  ],
  'Technology & Ecosystem': [
    'developer_experience',
    'protocol_simplicity',
    'open_source',
    'interoperability',
    'sustainability',
  ],
} as const satisfies Record<string, readonly string[]>

export type WordCategory = keyof typeof CATEGORY_WORDS

/**
 * Heading render order (spec-mandated). Intrinsic to the authoring order of
 * {@link CATEGORY_WORDS}: non-numeric string keys keep insertion order, so this
 * stays in sync by construction instead of being a hand-maintained twin.
 */
export const CATEGORY_ORDER = Object.keys(CATEGORY_WORDS) as WordCategory[]

/**
 * Pool word id → category, derived from {@link CATEGORY_WORDS}. Covers every id
 * in the backend WORD_POOL; the coverage test is the guard against drift.
 */
export const WORD_CATEGORY: Readonly<Record<string, WordCategory>> =
  Object.fromEntries(
    (Object.entries(CATEGORY_WORDS) as [WordCategory, readonly string[]][]).flatMap(
      ([category, ids]) => ids.map((id) => [id, category] as const),
    ),
  )

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
