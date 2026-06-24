/**
 * Pure selection helpers shared by the Selection + Edit modals (DEV-938).
 * Kept framework-free so the gating + progress maths are unit-testable without
 * rendering React.
 */

/** Fill ratio for the progress bar: selected / max, clamped to [0, 1]. */
export function progressFill(selectedCount: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(Math.max(selectedCount / max, 0), 1)
}

/** True once the user has hit the cap (no further additions allowed). */
export function isAtMax(selectedCount: number, max: number): boolean {
  return selectedCount >= max
}

/**
 * Toggle a word id within the cap: deselect if present, otherwise add only when
 * below `max`. At the cap an unselected id is a no-op (returns the same list)
 * — selecting a 6th is impossible, but deselecting any of the 5 still works.
 */
export function toggleSelection(selected: string[], id: string, max: number): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id)
  return selected.length < max ? [...selected, id] : selected
}
