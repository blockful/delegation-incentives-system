/**
 * Canonical matchmaking word pool + selection validation.
 *
 * ⚠️ v1 PLACEHOLDER SEEDS. The final ~20 AI-generated + Zeugh-validated,
 * deliberately-contrasting words are authored in BE-2 (DEV-899). Selection
 * writes validate against whatever this file exports, so finalizing the list is
 * a one-file edit with no schema or API change.
 *
 * The pool is served to the frontend (Selection modal) by BE-2's
 * `GET /selections/word-pool`; nothing imports the list across the wire.
 */
import { SELECTION_COUNT } from "@ens-dis/domain";

export interface PoolWord {
  /** Stable id stored in selections + signed in the auth message. */
  id: string;
  /** Human label shown in the UI. */
  label: string;
}

/**
 * ⚠️ Placeholder. The five mockup seeds + plausible governance values to give
 * the pool a realistic shape until BE-2 lands the AI+Zeugh list. Do NOT treat
 * these as final copy.
 */
export const WORD_POOL: readonly PoolWord[] = [
  { id: "security", label: "Security" },
  { id: "cost_efficiency", label: "Cost efficiency" },
  { id: "growth_investment", label: "Growth investment" },
  { id: "decentralization", label: "Decentralization" },
  { id: "public_goods_funding", label: "Public goods funding" },
  { id: "transparency", label: "Transparency" },
  { id: "credible_neutrality", label: "Credible neutrality" },
  { id: "censorship_resistance", label: "Censorship resistance" },
  { id: "user_privacy", label: "User privacy" },
  { id: "developer_experience", label: "Developer experience" },
  { id: "treasury_growth", label: "Treasury growth" },
  { id: "community_governance", label: "Community governance" },
  { id: "protocol_simplicity", label: "Protocol simplicity" },
  { id: "long_term_vision", label: "Long-term vision" },
  { id: "ecosystem_funding", label: "Ecosystem funding" },
  { id: "self_custody", label: "Self custody" },
  { id: "open_source", label: "Open source" },
  { id: "accessibility", label: "Accessibility" },
  { id: "sustainability", label: "Sustainability" },
  { id: "interoperability", label: "Interoperability" },
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
