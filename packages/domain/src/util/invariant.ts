/**
 * Simple assertion helper that narrows the type via `asserts condition`.
 * Throws with a descriptive message on failure.
 */
export function invariant(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`Invariant violation: ${message}`);
}
