# ENS name search

**Ticket:** DEV-714 — ENS Incentives - Implement ENS name search
**Branch:** `feat/search_by_ENS`
**Date:** 2026-05-21

## Problem

Both address-input surfaces in the app today only accept raw `0x…` addresses, even though the placeholder copy already promises ENS support ("Search by ENS name or 0x address…"). Users who only know a delegate by their ENS name (`nick.eth`) cannot use either search.

The two surfaces:

1. **Rounds page** — `apps/frontend/src/pages/RoundsPage/index.tsx`, "Inspect address" form. Single-input lookup that sets `?address=<0x>` on the URL and queries reward history for that wallet. `handleSubmit` (line 1122) rejects non-addresses with `"Invalid address"`.
2. **Voters page** — `apps/frontend/src/pages/VotersPage/index.tsx`, "Search voters" input above the active-voter grid. Client-side substring filter (line 325-332) that matches against `v.ensName` and `v.address`. Works for voters whose `ensName` field is populated by the API, fails silently for voters whose `ensName` is null but whose on-chain reverse record resolves to a real `.eth` name (visible as `0x5fa8…0e04` cards with no name shown).

## Goals

- Resolve ENS names to addresses on the Rounds page lookup, then route through the existing `?address=<0x>` flow. Gracefully handle unresolved/invalid names.
- On the Voters page, extend the existing substring filter so it matches against on-chain reverse-resolved ENS names too — not just the names the API happened to include — without adding new RPC traffic.
- Reuse the patterns the codebase already has (`useEnsAddress`, `useEnsName`, `MOCK_ENS_TO_ADDRESS` for tests). No new external services.

## Non-goals

- Autocomplete dropdown over the full ENS namespace (would require an external indexer).
- Storing ENS names in URLs as the canonical identifier (URLs continue to carry `0x` addresses).
- Backend changes to populate `ensName` more reliably (orthogonal work).
- Multichain ENS / L2 names.
- Changes to `/voters/:address` — that route already accepts ENS names via `useEnsAddress` (see `VoterProfilePage/index.tsx:718-730`) and is the reference pattern this design follows.

## Design

### Shared utility

A small helper module exposing:

```ts
// apps/frontend/src/utils/ens.ts
export function looksLikeEnsName(input: string): boolean
```

Rule: trimmed input contains at least one `.`, does not start with `0x`, and has no whitespace. We deliberately stay loose — wagmi/viem will reject malformed names on resolution. We only need a fast pre-check to decide whether to attempt resolution vs. address validation.

### Rounds page — full-name resolution lookup

**File:** `apps/frontend/src/pages/RoundsPage/index.tsx`

Change `handleSubmit` to be async-aware. New control flow:

1. Trim input. Empty → existing `handleClear()`.
2. `isAddress(next)` → existing fast path: set `?address=` and return.
3. `looksLikeEnsName(next)` → call `getEnsAddress` (viem public client) or `MOCK_ENS_TO_ADDRESS[next.toLowerCase()]` when `env.useMockApi`.
   - Success → set `?address=<resolved-0x>` (URL contract unchanged).
   - Null/throw → `setInputError("Couldn't resolve ${next}")`.
4. Neither address nor name-shaped → existing `setInputError("Invalid address")`.

The resolution call lives in a small custom hook so the component stays readable:

```ts
// apps/frontend/src/features/ens/useResolveEnsName.ts
export function useResolveEnsName(): {
  resolve: (name: string) => Promise<`0x${string}` | null>
  isResolving: boolean
}
```

Internally uses `usePublicClient()` from wagmi to call `client.getEnsAddress({ name: normalize(name) })`. In mock mode, short-circuits to the `MOCK_ENS_TO_ADDRESS` lookup. Tracks an `isResolving` boolean for UI state.

**UI affordances during resolution:**

- Search button shows "Resolving…" text and is disabled while `isResolving` is true.
- Input remains editable so the user can correct typos; a fresh submit replaces the in-flight resolution.
- Inline error in the existing `inputError` slot, same styling as today's "Invalid address". No toasts.

**Existing legacy form:** `apps/frontend/src/pages/RoundsPage/components/AddressLookupForm.tsx` is not currently rendered (grep confirms no live import). Leave it alone — out of scope.

### Voters page — substring filter over resolved names

**File:** `apps/frontend/src/pages/VotersPage/index.tsx`

Today each `VoterCard` independently calls `useEnsName({ address: voter.address })` on mount (`VoterCard/index.tsx:299-301`), unconditionally — even when `voter.ensName` is already populated. We pay N RPC calls per Voters page render anyway; wagmi/react-query dedupes by query key and caches them.

We hoist that resolution to the page and feed it back into the filter dataset:

```ts
// apps/frontend/src/features/ens/useVoterEnsNames.ts
export function useVoterEnsNames(voters: VoterDetail[] | null):
  Map<string /* lower-cased address */, string | null>
```

Internally:
- For each voter, call `useEnsName({ address, query: { enabled: !voter.ensName } })`. Voters with an API-provided `ensName` skip the RPC entirely.
- Returns a stable `Map<lowercasedAddress, resolvedName | null>` that updates as resolutions arrive.

VotersPage usage:

```ts
const resolvedNames = useVoterEnsNames(data)

const voters = useMemo(() => {
  if (!data) return null
  let filtered = [...data]
  const q = search.trim().toLowerCase()
  if (q.length > 0) {
    filtered = filtered.filter((v) => {
      const apiEns = v.ensName?.toLowerCase() ?? ''
      const resolvedEns = (resolvedNames.get(v.address.toLowerCase()) ?? '').toLowerCase()
      const addr = v.address.toLowerCase()
      return apiEns.includes(q) || resolvedEns.includes(q) || addr.includes(q)
    })
  }
  // ...existing sort logic
}, [data, sort, shuffleSeed, search, resolvedNames])
```

VoterCard refactor: accept `resolvedEnsName?: string | null` as a prop and stop calling `useEnsName` itself. Same total network calls (still N, hoisted from N cards to one page), but the resolved data is now available for filtering.

**UX during initial resolution batch:**
On first page load, resolutions arrive asynchronously over ~1–2 s. If a user types a search before all names have resolved, matches pop in as data arrives. This matches the existing grid fade-in behavior and React's optimistic-UI ethos. We do not block filtering on the batch or show a global "resolving" spinner — the grid already has skeletons during the initial `useVoters()` load.

### Mock-mode parity

Both surfaces respect `env.useMockApi`:
- Rounds resolution: when `useMockApi`, `useResolveEnsName.resolve(name)` returns `MOCK_ENS_TO_ADDRESS[name.toLowerCase()] ?? null` synchronously (wrapped in a resolved Promise). No RPC.
- Voters resolution: when `useMockApi`, `useVoterEnsNames` returns a static map built by reverse-mapping `MOCK_ENS_TO_ADDRESS`. The `useEnsName` calls inside are already gated by wagmi's mock setup (see `apps/frontend/src/test/mocks/wagmi.ts`).

This mirrors the existing pattern in `VoterProfilePage/index.tsx:723-726`.

## Error handling

| Surface       | Input                                          | Result                                                    |
|---------------|------------------------------------------------|-----------------------------------------------------------|
| Rounds        | `0x…` (valid)                                  | Set `?address=` (today's behavior).                       |
| Rounds        | `nick.eth` resolves                            | Set `?address=<resolved-0x>`.                             |
| Rounds        | `nick.eth` does not resolve / RPC error        | Inline error: "Couldn't resolve nick.eth". Input stays.   |
| Rounds        | Malformed (`foo`, `0xnotreallyaddress`)        | Inline error: "Invalid address".                          |
| Rounds        | Empty                                          | Same as Clear — strip URL `?address=`.                    |
| Voters filter | Substring of API ensName / resolved ensName / address | Matching cards stay visible; non-matches hide.     |
| Voters filter | No matches                                     | Existing empty state ("No voters match your search").     |

RPC failures on the Voters page are non-fatal: the affected voter simply isn't matchable by name and remains matchable by address. We do not surface per-voter RPC errors in the UI.

## Testing

**Unit (Vitest):**
- `looksLikeEnsName` — table-driven cases: `nick.eth` ✓, `sub.nick.eth` ✓, `0x123…` ✗, `nick` ✗, `nick.eth foo` ✗.
- `useResolveEnsName` — mock-mode resolves from `MOCK_ENS_TO_ADDRESS`; real-mode delegates to `publicClient.getEnsAddress`; returns null on resolver miss; rejects on RPC error.
- VotersPage filter — given a voter with `ensName: null` and a fake `resolvedNames` map containing `nettie.eth`, typing `nett` includes that voter.

**Component (Testing Library):**
- RoundsPage: typing `nick.eth` + clicking Search shows "Resolving…", then updates `?address=` to the mocked 0x and surfaces history.
- RoundsPage: typing `notreal.eth` + clicking Search surfaces the inline "Couldn't resolve" error and leaves the URL untouched.
- VotersPage: with `0x5fa8…0e04` having `ensName: null` and `MOCK_ENS_TO_ADDRESS` reverse-mapping it to `nettie.eth`, typing `nett` keeps that card visible. Typing `nett` with no such mapping hides it.

**E2E (Playwright, `apps/frontend/e2e/rounds.spec.ts`):**
- Add one happy-path: visit `/rounds`, type `nick.eth`, click Search, assert the URL becomes `/rounds?address=<expected-0x>` and the rewards table renders.
- Add one sad-path: type `not-a-real-name.eth`, assert the inline error appears.

E2E for Voters page is light because the mock-API ENS reverse map is small; the substring behavior is well-covered by unit + component tests.

## Implementation order

1. `looksLikeEnsName` utility + tests.
2. `useResolveEnsName` hook + tests (mock mode + real mode).
3. RoundsPage wiring: handleSubmit becomes async-aware; "Resolving…" UI; inline error.
4. `useVoterEnsNames` hook.
5. VotersPage filter integration + VoterCard prop refactor (drops internal `useEnsName`).
6. Tests at each layer + Playwright happy/sad paths.

Each step lands compiling and passing tests before moving to the next; no half-finished states.

## Open questions

None.

## Risks

- **Rate limits / RPC reliability.** The Voters page already pays N reverse-resolution RPC calls per session; this design doesn't add to that. The Rounds page adds one forward resolution per user search submit — well within any sane RPC budget.
- **Edge case: input with `.` that isn't a valid ENS name** (e.g., `foo.bar.baz`). `looksLikeEnsName` returns true, we attempt resolution, viem/wagmi returns null, the user sees "Couldn't resolve". Acceptable.
- **Normalize / IDN names.** viem's `normalize` from `viem/ens` is used inside the resolution hook; matches what `useEnsAddress` does internally. No special handling required.
