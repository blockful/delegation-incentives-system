# Delegate Profile — Surface "up to X% APY"

## Goal

Engage visitors landing on a delegate profile (e.g. `/delegates/griff.eth`) by
showing what they could earn if they delegate. Today the page has no APY
mention — the only conversion hint is "Gas sponsored by the incentives program"
below the Delegate button.

## What we're adding

Surface the same "up to X% APY" headline that the landing hero already shows,
directly on the delegate profile hero CTA — in both the delegate-now state and
the already-delegated state. Same copy in both states so they read as a single
promise, not two different metrics.

## Data source

Reuse `/tiers/progression` → `maxDelegatorApyPct` (string, e.g. `"5.75"`).

- Same field the landing hero uses (`HeroSection` via
  `DisconnectedLanding`/`ConnectedLanding`/`DelegatedLanding`). Keeping a single
  source of truth means the two pages can't drift apart.
- The number is per-tier, not per-delegate — delegator APY is the same
  regardless of which active delegate the user picks (pool size / total VP).
  This makes the headline correct for any delegate profile.

## UI changes

All changes confined to `apps/frontend/src/pages/DelegateProfilePage/index.tsx`.

### 1. Fetch tier data

Mirror the pattern from `apps/frontend/src/pages/LandingPage/index.tsx`:

```ts
const fetchTiers = useCallback(() => api.tierProgression(), [])
const tiers = useAsync(fetchTiers)
const apyPct = tiers.data?.maxDelegatorApyPct ?? null
```

Do **not** block page render on this. If the page already has the delegate
loaded, render the hero immediately and let APY appear when available. If the
fetch fails, the page renders with the plain copy — no error UI, no degraded
state.

### 2. CTA button copy

When `apyPct` is present:

```
Delegate — Earn up to {apyPct}% APY  [Free]
```

When `apyPct` is null (loading or failed):

```
Delegate  [Free]
```

`[Free]` is the existing `FreeTag` and stays inline.

### 3. Delegated-state pill copy

When `apyPct` is present:

```
Delegated · Earn up to {apyPct}% APY
```

When `apyPct` is null:

```
Delegated
```

### 4. Styling

The button's `font-size: xl` and `padding: lg 2xl` already accommodate a longer
label, and `CtaWrapper` has `max-width: 400px` so the text wraps on narrow
viewports. Verify that:

- The wrapped two-line state on mobile remains readable (line-height inherited
  from the button is fine; no override needed).
- The `FreeTag` stays at the end of the last line — it's an inline element, so
  this happens naturally.

No new tokens, no new components, no animations.

## Failure modes

| Condition                              | Behavior                              |
| -------------------------------------- | ------------------------------------- |
| `tiers` still loading                  | Plain "Delegate [Free]" CTA           |
| `tiers` fetch errored                  | Plain "Delegate [Free]" CTA, no toast |
| `maxDelegatorApyPct` is missing/empty  | Treat as null → plain copy            |

The delegate profile page must not error out because of a tier-data failure —
APY is an enhancement, not a requirement.

## Out of scope

- Hooking the page into react-query for cross-page cache sharing with Landing.
  The codebase mixes `useAsync` and react-query; staying with `useAsync` matches
  the rest of `DelegateProfilePage` and the Landing page. Consolidating fetch
  patterns is a separate refactor.
- A per-delegate APY (would require simulating a delegator with a specific
  balance — not what "up to" means).
- Showing both current-tier and max APY ("X% now, up to Y%"). Single number is
  cleaner.
- New stat-grid tile for APY. The CTA placement is more action-oriented.

## Test impact

No new tests required. The change is presentational. Existing render/snapshot
tests for `DelegateProfilePage` that assert exact button text would need to be
updated; check for any in `apps/frontend/src/pages/DelegateProfilePage/` and the
e2e suite before committing.
