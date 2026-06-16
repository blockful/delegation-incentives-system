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
 * Decided 2026-06-16: exactly 5 (not "up to 5").
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
