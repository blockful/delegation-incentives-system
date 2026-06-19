/**
 * Matchmaking (ENS Incentives v2) — shared selection primitives.
 *
 * Used by BOTH the backend (signature recovery, validation) and the frontend
 * (message signing). Keep this framework-free (no Node/DOM deps) so both apps
 * can import it from `@ens-dis/domain`.
 *
 * Model: a participant picks a fixed-size SET of word ids from a pool. There is
 * no ordering — a selection is a set, matched by overlap. Visibility is public
 * (no privacy): only writes are authenticated, via a signature over the message
 * built below.
 */

/**
 * Number of words a participant selects from the pool.
 */
export const SELECTION_COUNT = 5;

/**
 * The deterministic message a wallet signs to authorize writing its selection.
 *
 * BOTH sides MUST build the exact same bytes — the frontend signs this, the
 * backend rebuilds it and recovers the signer. So we normalize here (lowercase
 * the address, sort the word ids) and callers must NEVER hand-roll the string.
 *
 * Sorting makes the message a function of the *set*, not the pick order, so the
 * same selection always yields the same signature regardless of UI order.
 *
 * No nonce in v1: the write is an idempotent upsert of the caller's own row, so
 * a replayed signature only re-sets the same words for the same address.
 */
export function buildSelectionMessage(address: string, words: string[]): string {
  const addr = address.toLowerCase();
  const sorted = [...words].sort();
  return [
    "ENS Incentives — set your values",
    "",
    `Address: ${addr}`,
    `Values: ${sorted.join(", ")}`,
  ].join("\n");
}

/** A match is "strong" at or above this overlap percentage. */
export const STRONG_MATCH_THRESHOLD = 80;

export interface MatchScore {
  /** Overlap as a percentage of SELECTION_COUNT (e.g. 4 of 5 shared = 80). */
  percent: number;
  /** percent >= STRONG_MATCH_THRESHOLD. */
  strongMatch: boolean;
  /** Words both selected. */
  sharedWords: string[];
  /** Words only `a` selected. */
  aUnique: string[];
  /** Words only `b` selected. */
  bUnique: string[];
}

/**
 * Score two selections by set overlap. Symmetric in the score; `sharedWords` is
 * ordered by `a`. Used client-side for per-card / profile match and server-side
 * for the aggregate match-count. Coarse formula (Q#5 default): shared ÷ 5.
 *
 * Both selections are expected to hold SELECTION_COUNT words; the denominator is
 * fixed at SELECTION_COUNT so an unselected (empty) side scores 0.
 */
export function scoreSelection(a: string[], b: string[]): MatchScore {
  const setA = new Set(a);
  const setB = new Set(b);
  const sharedWords = a.filter((w) => setB.has(w));
  const aUnique = a.filter((w) => !setB.has(w));
  const bUnique = b.filter((w) => !setA.has(w));
  const percent = Math.round((sharedWords.length / SELECTION_COUNT) * 100);
  return {
    percent,
    strongMatch: percent >= STRONG_MATCH_THRESHOLD,
    sharedWords,
    aUnique,
    bUnique,
  };
}
