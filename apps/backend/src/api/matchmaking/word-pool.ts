/**
 * Canonical matchmaking word pool + selection validation.
 * Served to the frontend (Selection modal) via `GET /selections/word-pool`;
 * nothing imports the list across the wire.
 */
import { SELECTION_COUNT } from "@ens-dis/domain";

export interface PoolWord {
  /** Stable id stored in selections + signed in the auth message. */
  id: string;
  /** Human label shown in the UI. */
  label: string;
}

/**
 * The canonical matchmaking values (research-provided list). The `label` is the
 * user-facing copy; the `id` is stable and stored in selections + signed in the
 * auth message, so a label can be reworded without invalidating stored picks —
 * but renaming an `id` orphans existing selections. The frontend groups these 20
 * into display categories (see the frontend `wordCategories.ts`); the backend
 * stays a flat list and knows nothing about categories. Order here is the
 * server's canonical order (the frontend regroups it for display).
 */
export const WORD_POOL: readonly PoolWord[] = [
  // Growth & Adoption
  { id: "ens_adoption", label: "ENS Adoption" },
  { id: "user_experience", label: "ENS User Experience" },
  { id: "community_onboarding", label: "ENS Community Onboarding" },
  { id: "education_literacy", label: "ENS Education & Literacy" },
  { id: "ecosystem_integrations", label: "Ecosystem Integrations" },
  // Protocol & Product
  { id: "ensv2", label: "ENSv2" },
  { id: "fair_pricing", label: "Fair ENS Pricing" },
  { id: "name_ownership_rights", label: "Name Ownership Rights" },
  { id: "decentralization_resilience", label: "Decentralization & Resilience" },
  { id: "service_provider_quality", label: "ENS Service Provider Quality" },
  // Funding & Treasury
  { id: "financial_sustainability", label: "Financial Sustainability" },
  { id: "treasury_stewardship", label: "Treasury & Endowment Stewardship" },
  { id: "cost_efficiency", label: "Cost Efficiency" },
  { id: "protocol_first_funding", label: "Protocol-First Funding" },
  { id: "public_goods_funding", label: "Public Goods Funding" },
  // Governance & Accountability
  { id: "accountability_reporting", label: "Accountability & Reporting" },
  { id: "operational_execution", label: "Operational Execution" },
  { id: "governance_transparency", label: "Governance Transparency" },
  { id: "clear_governance_process", label: "Clear Governance Process" },
  { id: "long_term_strategy", label: "Long Term Strategy" },
];

const POOL_IDS: ReadonlySet<string> = new Set(WORD_POOL.map((w) => w.id));

/** Why a selection was rejected (null = valid). */
export type SelectionValidationError = "count" | "duplicate" | "unknown_word";

/**
 * Validate a raw selection against the pool:
 *  - exactly SELECTION_COUNT ids,
 *  - no duplicates,
 *  - every id present in the pool.
 *
 * Returns the first failure reason, or null when valid.
 */
export function validateSelection(words: string[]): SelectionValidationError | null {
  if (words.length !== SELECTION_COUNT) return "count";
  const unique = new Set(words);
  if (unique.size !== words.length) return "duplicate";
  for (const w of words) {
    if (!POOL_IDS.has(w)) return "unknown_word";
  }
  return null;
}

/** Convenience boolean wrapper around {@link validateSelection}. */
export function isValidSelection(words: string[]): boolean {
  return validateSelection(words) === null;
}
