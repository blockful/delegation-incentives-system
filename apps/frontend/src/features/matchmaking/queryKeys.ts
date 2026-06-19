/**
 * TanStack Query keys for matchmaking.
 *
 * Invalidating the `all` prefix (plus `['voters']`) after a write resolves every
 * matchmaking surface at once — see useSubmitSelection.
 */
export const matchmakingKeys = {
  all: ['matchmaking'] as const,
  wordPool: () => ['matchmaking', 'word-pool'] as const,
  selection: (address?: string) =>
    ['matchmaking', 'selection', address?.toLowerCase() ?? null] as const,
  matchCount: (address?: string) =>
    ['matchmaking', 'match-count', address?.toLowerCase() ?? null] as const,
}
