# Backend API Gaps — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the backend API so the frontend can display real data instead of hardcoded values. Seven tasks, ordered by impact.

**Architecture:** All changes are additive — new fields on existing endpoints or new endpoints. No breaking changes to existing response shapes. Follows existing patterns: Hono routes, Zod schemas, adapter + helpers pattern, OpenAPI auto-docs.

**Tech Stack:** Hono, Zod, Drizzle (Ponder DB), viem, vitest

**Spec:** `docs/superpowers/specs/2026-03-15-frontend-thorin-redesign.md`

---

## Task 1: Add `maxDelegatorApyPct` to Tiers Endpoint

The frontend hero says "It could be earning X% APY" but has no source for a real number. The max delegator APY is the highest APY a delegator could earn in the current tier, based on the delegator cap.

**Files:**
- Modify: `apps/backend/src/api/routes/tiers.ts`
- Modify: `apps/backend/src/api/schemas.ts`
- Modify: `apps/backend/src/api/helpers.ts`
- Test: `apps/backend/src/api/routes/__tests__/tiers.test.ts`

**Formula:**
```
maxDelegatorApyPct = (delegatorCapEns × 12 / delegatorCapEns) × 100
```

Wait — that simplifies to `1200%` for all tiers, which is wrong. The cap is the *maximum reward*, not the balance. The real max APY depends on the minimum balance that would hit the cap.

A cleaner approach: calculate what APY someone with a median-sized balance would get. But that requires querying balances.

**Simplest correct approach:** The max APY is when `estimatedReward == delegatorCap` and the user's balance is exactly `delegatorCap / (poolSize * 0.9) * totalDelegatedBalance`. This is circular.

**Pragmatic approach:** Add the delegator cap in ENS per year as context, let the frontend calculate. Or: compute the APY for someone whose reward equals exactly the delegator cap, using the actual total pool weight from the current month.

- [ ] **Step 1: Write failing test**

```typescript
// apps/backend/src/api/routes/__tests__/tiers.test.ts
// Add to existing test suite:
it('includes maxDelegatorApyPct in response', async () => {
  const res = await app.request('/tiers/progression')
  const body = await res.json()
  expect(body).toHaveProperty('maxDelegatorApyPct')
  expect(typeof body.maxDelegatorApyPct).toBe('string')
  expect(parseFloat(body.maxDelegatorApyPct)).toBeGreaterThanOrEqual(0)
})
```

- [ ] **Step 2: Run test — verify failure**

```bash
cd apps/backend && pnpm vitest run src/api/routes/__tests__/tiers.test.ts
```

- [ ] **Step 3: Add helper function**

In `apps/backend/src/api/helpers.ts`:

```typescript
/**
 * Compute the max delegator APY for a tier.
 * This is the APY a delegator would earn if their monthly reward
 * equals the delegator cap — i.e., they hold enough ENS that their
 * share of the 90% delegator pool hits the cap.
 *
 * APY = (delegatorCap * 12) / balance * 100
 * where balance = delegatorCap / (delegatorPoolShare / totalWeight)
 * simplified: APY = delegatorPoolShare / totalWeight * 12 * 100
 *
 * When totalWeight is unknown (no balances loaded), fall back to
 * (delegatorCap * 12 / minimumBalance) * 100 using 1 ENS minimum.
 */
export function computeMaxDelegatorApyPct(
  poolSizeEns: number,
  delegatorPoolBps: number,
  totalDelegatorWeightEns: number,
): string {
  if (totalDelegatorWeightEns <= 0) return '0.00'
  const delegatorPool = poolSizeEns * (delegatorPoolBps / 10_000)
  const maxMonthlyYield = delegatorPool / totalDelegatorWeightEns
  const apyPct = maxMonthlyYield * 12 * 100
  return apyPct.toFixed(2)
}
```

This gives the APY as if the user had 1 "unit" of weight in the pool — which is the best-case scenario (the smaller your share of total weight, the better your APY, until you hit the cap).

Actually, the simplest and most honest approach: **the max APY = (delegatorCap × 12) / (the balance that would earn exactly delegatorCap)**. But we need total weight for that.

**Alternative (recommended):** Just compute `(delegatorCap_ens * 12 / median_delegator_balance_ens) * 100` using a round number like 100 ENS as "typical balance". This gives a relatable number. Or expose the `delegatorCapEns` per year and let the frontend show "up to X ENS/year" instead of an APY%.

**Decision for implementer:** Read the existing `computeApyPct` function and the APY route to understand how share weights work. The `totalShareWei` from the APY endpoint represents total delegator weight. Use that to compute a pool-wide APY rate:

```typescript
// Pool-wide delegator APY rate = (delegatorPool * 12) / totalDelegatorWeight * 100
// This is the APY every delegator gets before caps kick in
```

- [ ] **Step 4: Add to tiers response schema**

In `apps/backend/src/api/schemas.ts`, add to `TierProgressionSchema`:

```typescript
maxDelegatorApyPct: z.string().openapi({
  description: 'Maximum delegator APY percentage for the current tier',
  example: '5.75',
}),
```

- [ ] **Step 5: Compute in tiers route**

In `apps/backend/src/api/routes/tiers.ts`, after computing `currentTierIndex`:

1. Get total delegator weight using `DelegationAdapter.getAccountBalances()` or from `VotingPowerAdapter`
2. Compute the pool-wide delegator APY rate
3. Add `maxDelegatorApyPct` to the response

- [ ] **Step 6: Run test — verify pass**

```bash
cd apps/backend && pnpm vitest run src/api/routes/__tests__/tiers.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): add maxDelegatorApyPct to tiers/progression endpoint"
```

---

## Task 2: Add Round Info Endpoint

The frontend hardcodes round number, dates, and progress. The backend should provide this.

A "round" is a 30-day period. Round 1 started on a known date. Each subsequent round starts when the previous ends.

**Files:**
- Create: `apps/backend/src/api/routes/rounds.ts`
- Modify: `apps/backend/src/api/schemas.ts`
- Modify: `apps/backend/src/api/index.ts` (register route)
- Test: `apps/backend/src/api/routes/__tests__/rounds.test.ts`

- [ ] **Step 1: Define round constants in domain config**

In `packages/domain/src/config.ts`, add:

```typescript
/** Round 1 started on this date (UTC). Each round is 30 days. */
export const ROUND_1_START = new Date('2025-01-15T00:00:00Z')
export const ROUND_DURATION_DAYS = 30
```

Adjust `ROUND_1_START` to the actual launch date.

- [ ] **Step 2: Write failing test**

```typescript
// apps/backend/src/api/routes/__tests__/rounds.test.ts
describe('GET /rounds/current', () => {
  it('returns current round info', async () => {
    const res = await app.request('/rounds/current')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('roundNumber')
    expect(body).toHaveProperty('startDate')
    expect(body).toHaveProperty('endDate')
    expect(body).toHaveProperty('percentComplete')
    expect(body).toHaveProperty('daysRemaining')
    expect(body.roundNumber).toBeGreaterThanOrEqual(1)
    expect(body.percentComplete).toBeGreaterThanOrEqual(0)
    expect(body.percentComplete).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 3: Add schema**

```typescript
// In schemas.ts
export const RoundInfoSchema = z.object({
  roundNumber: z.number().openapi({ description: 'Current round number (1-based)', example: 2 }),
  startDate: z.string().openapi({ description: 'Round start date ISO', example: '2025-02-14T00:00:00Z' }),
  endDate: z.string().openapi({ description: 'Round end date ISO', example: '2025-03-16T00:00:00Z' }),
  percentComplete: z.number().openapi({ description: 'Round progress 0-100', example: 47 }),
  daysRemaining: z.number().openapi({ description: 'Days until round end', example: 14 }),
  poolSizeEns: z.string().openapi({ description: 'Current tier pool size', example: '5000' }),
  tierIndex: z.number().openapi({ description: 'Current tier index', example: 0 }),
})
```

- [ ] **Step 4: Implement route**

```typescript
// apps/backend/src/api/routes/rounds.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { ROUND_1_START, ROUND_DURATION_DAYS } from '@ens-dis/domain'
import { RoundInfoSchema } from '../schemas'
import { buildDataSource } from '../data-source'
import { fetchActiveDelegates, fetchMonthContext } from '../helpers'

function getCurrentRound(): { roundNumber: number; startDate: Date; endDate: Date } {
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const msSinceStart = now.getTime() - ROUND_1_START.getTime()
  const roundIndex = Math.floor(msSinceStart / (ROUND_DURATION_DAYS * msPerDay))
  const roundNumber = roundIndex + 1
  const startDate = new Date(ROUND_1_START.getTime() + roundIndex * ROUND_DURATION_DAYS * msPerDay)
  const endDate = new Date(startDate.getTime() + ROUND_DURATION_DAYS * msPerDay)
  return { roundNumber, startDate, endDate }
}

const route = createRoute({
  method: 'get',
  path: '/rounds/current',
  tags: ['Rounds'],
  summary: 'Get current round info',
  responses: {
    200: { content: { 'application/json': { schema: RoundInfoSchema } }, description: 'Current round' },
  },
})

export const roundsRouter = new OpenAPIHono()

roundsRouter.openapi(route, async (c) => {
  const { roundNumber, startDate, endDate } = getCurrentRound()
  const now = new Date()
  const totalMs = endDate.getTime() - startDate.getTime()
  const elapsedMs = now.getTime() - startDate.getTime()
  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

  const ds = buildDataSource()
  const { activeDelegates } = await fetchActiveDelegates(ds)
  const { poolTier, currentTierIndex } = await fetchMonthContext(ds, [...activeDelegates])

  return c.json({
    roundNumber,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    percentComplete,
    daysRemaining,
    poolSizeEns: formatWholeEns(poolTier.poolSize),
    tierIndex: currentTierIndex,
  })
})
```

- [ ] **Step 5: Register route in `src/api/index.ts`**

```typescript
import { roundsRouter } from './routes/rounds'
app.route('/', roundsRouter)
```

- [ ] **Step 6: Run test — verify pass**

```bash
cd apps/backend && pnpm vitest run src/api/routes/__tests__/rounds.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): add GET /rounds/current endpoint"
```

---

## Task 3: Extend Delegates Endpoint with Metadata

The frontend needs ENS names, voting power, delegator counts, active-since dates, and proposal vote history for each delegate. Currently only addresses are returned.

**Files:**
- Modify: `apps/backend/src/api/routes/delegates.ts`
- Modify: `apps/backend/src/api/schemas.ts`
- Test: `apps/backend/src/api/routes/__tests__/delegates.test.ts`

**Data sources available (already indexed):**
- **Voting power:** `VotingPowerAdapter.getVotingPower(addresses)` → `Map<string, Wei>`
- **Delegator count:** `DelegationAdapter.getActiveDelegations(delegateIds, at)` → count per delegate
- **Active since:** `ens_delegation_event` table → earliest delegation event per delegate
- **Proposal votes:** `VoteAdapter.getVotesForProposals(proposalIds)` → check which proposals each delegate voted on
- **ENS names:** Not indexed. Resolve via viem `getEnsName()` or leave null for frontend to resolve via wagmi.

- [ ] **Step 1: Add DelegateDetailSchema**

```typescript
// In schemas.ts
export const DelegateDetailSchema = z.object({
  address: z.string(),
  ensName: z.string().nullable(),
  votingPower: z.string().nullable().openapi({ description: 'Voting power in wei' }),
  delegatorCount: z.number().nullable(),
  activeSince: z.string().nullable().openapi({ description: 'ISO date of first delegation received' }),
  last10ProposalsVoted: z.array(z.boolean()).nullable().openapi({
    description: 'Array of 10 booleans, true = delegate voted on that proposal',
  }),
})

export const ActiveDelegatesDetailSchema = z.object({
  count: z.number(),
  delegates: z.array(DelegateDetailSchema),
})
```

- [ ] **Step 2: Write failing test**

```typescript
it('returns delegate details with metadata', async () => {
  const res = await app.request('/delegates/active')
  const body = await res.json()
  expect(body.delegates[0]).toHaveProperty('address')
  expect(body.delegates[0]).toHaveProperty('votingPower')
  expect(body.delegates[0]).toHaveProperty('delegatorCount')
  expect(body.delegates[0]).toHaveProperty('last10ProposalsVoted')
  expect(body.delegates[0].last10ProposalsVoted).toHaveLength(10)
})
```

- [ ] **Step 3: Implement enrichment in delegates route**

In `apps/backend/src/api/routes/delegates.ts`:

```typescript
// After getting activeDelegates set:
const delegateAddresses = [...activeDelegates]

// 1. Get voting power
const vpMap = await ds.votingPower.getVotingPower(delegateAddresses)

// 2. Get delegator counts — count delegations per delegate
const now = Math.floor(Date.now() / 1000)
const delegations = await ds.delegations.getActiveDelegations(delegateAddresses, now)
const delegatorCounts = new Map<string, number>()
for (const d of delegations) {
  const key = d.delegate.toLowerCase()
  delegatorCounts.set(key, (delegatorCounts.get(key) ?? 0) + 1)
}

// 3. Get last 10 proposals + which each delegate voted on
const proposals = await ds.proposals.getRecentProposals(10)
const proposalIds = proposals.map(p => p.id)
const votes = await ds.votes.getVotesForProposals(proposalIds)
const votesByVoter = new Map<string, Set<string>>()
for (const v of votes) {
  const key = v.voter.toLowerCase()
  if (!votesByVoter.has(key)) votesByVoter.set(key, new Set())
  votesByVoter.get(key)!.add(v.proposalId)
}

// 4. Build DelegateDetail[]
const delegates = delegateAddresses.map(addr => {
  const lower = addr.toLowerCase()
  const voterProposals = votesByVoter.get(lower) ?? new Set()
  return {
    address: addr,
    ensName: null, // ENS resolution left to frontend (wagmi)
    votingPower: vpMap.get(lower)?.toString() ?? null,
    delegatorCount: delegatorCounts.get(lower) ?? 0,
    activeSince: null, // TODO: query earliest delegation event if needed
    last10ProposalsVoted: proposalIds.map(pid => voterProposals.has(pid)),
  }
})
```

- [ ] **Step 4: Update response schema reference**

Change the route's response schema from `ActiveDelegatesSchema` to `ActiveDelegatesDetailSchema`.

- [ ] **Step 5: Run test — verify pass**

```bash
cd apps/backend && pnpm vitest run src/api/routes/__tests__/delegates.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): extend GET /delegates/active with VP, delegator count, vote history"
```

---

## Task 4: Fix Status Endpoint

The frontend expects `{ activeDelegateCount, proposalCount, cachedDistributions }` but the `/status` endpoint returns `{ mainnet: { id, block } }`.

**Files:**
- Modify: `apps/backend/src/api/routes/health.ts`
- Test: `apps/backend/src/api/routes/__tests__/health.test.ts`

- [ ] **Step 1: Check current `/status` implementation**

Read `apps/backend/src/api/routes/health.ts` to understand the current response shape. The Ponder framework may have overridden the original implementation during the rename from `indexer` to `backend`. The `/status` endpoint may now be a Ponder built-in.

- [ ] **Step 2: Write failing test**

```typescript
it('returns activeDelegateCount and proposalCount', async () => {
  const res = await app.request('/status')
  const body = await res.json()
  expect(body).toHaveProperty('activeDelegateCount')
  expect(body).toHaveProperty('proposalCount')
  expect(body).toHaveProperty('cachedDistributions')
})
```

- [ ] **Step 3: Fix or re-add the status handler**

If Ponder's built-in `/status` is overriding ours, rename our endpoint to `/api/status` or `/app-status`, or mount it at a different path. Alternatively, add our fields to the Ponder status response.

The implementation should call `fetchActiveDelegates(ds)` and `ds.distributions.list()` — same as the original.

- [ ] **Step 4: Run test — verify pass**

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix(api): restore /status endpoint with activeDelegateCount and proposalCount"
```

---

## Task 5: Handle 7 Tiers in Frontend

The backend returns 7 tiers but the Paper design shows 6. The frontend currently crashes or truncates.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage/sections/TierTableSection.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/components/TierTable.tsx`
- Modify: `apps/frontend/src/test/mocks/fixtures/rounds.ts`

- [ ] **Step 1: Update fixture to have 7 tiers**

Update `rounds.ts` fixture to include 7 tiers matching the real API response.

- [ ] **Step 2: Update TierTable and TierTableSection**

Both components should render however many tiers the API returns (use `.map()` — no hardcoded count). Verify they already do this, fix if not.

- [ ] **Step 3: Update tests**

Change assertions from "Tier #6" to "Tier #7" where applicable.

- [ ] **Step 4: Run tests**

```bash
cd apps/frontend && pnpm vitest run
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix: handle 7 tiers from API instead of hardcoded 6"
```

---

## Task 6: Handle Negative Growth in Frontend

The API returns `currentGrowthPct: "-0.63"` but the frontend assumes positive values.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage/sections/RoundStatusBar.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/index.tsx`

- [ ] **Step 1: Fix RoundStatusBar**

Show `+` prefix only for positive growth. Use red/orange color for negative growth.

```typescript
const growthPrefix = parseFloat(currentGrowthPct) >= 0 ? '+' : ''
const growthColor = parseFloat(currentGrowthPct) >= 0 ? '#199C75' : '#C6301B'
```

- [ ] **Step 2: Fix RoundsPage growth display if applicable**

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix: handle negative VP growth display with color coding"
```

---

## Task 7: Wire Frontend to Real Round Data

Once Tasks 1-2 are deployed, update the frontend to use real data instead of hardcoded values.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage/sections/HeroSection.tsx`
- Modify: `apps/frontend/src/pages/LandingPage/index.tsx`
- Modify: `apps/frontend/src/pages/RoundsPage/index.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage/index.tsx`
- Modify: `apps/frontend/src/api/client.ts`
- Modify: `apps/frontend/src/api/types.ts`
- Delete: `apps/frontend/src/config/round.ts`

- [ ] **Step 1: Add round API types and client method**

```typescript
// In api/types.ts
export interface RoundInfoResponse {
  roundNumber: number
  startDate: string
  endDate: string
  percentComplete: number
  daysRemaining: number
  poolSizeEns: string
  tierIndex: number
}

// Add maxDelegatorApyPct to TierProgressionResponse
```

```typescript
// In api/client.ts
currentRound: () => request<RoundInfoResponse>('/rounds/current'),
```

- [ ] **Step 2: Update LandingPage to use maxDelegatorApyPct**

Replace `momGrowthMaxPct` in HeroSection with `maxDelegatorApyPct` from the tiers endpoint.

- [ ] **Step 3: Update RoundsPage and DashboardPage to use /rounds/current**

Replace all imports from `@/config/round` with data from `api.currentRound()`.

- [ ] **Step 4: Delete `src/config/round.ts`**

- [ ] **Step 5: Update tests with new fixtures**

- [ ] **Step 6: Run all tests**

```bash
cd apps/frontend && pnpm vitest run
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: wire frontend to real round data and max APY from API"
```

---

## Task Order

```
Backend (can run in parallel):
  Task 1: maxDelegatorApyPct on tiers endpoint
  Task 2: GET /rounds/current endpoint
  Task 3: Extend delegates with metadata
  Task 4: Fix /status endpoint

Frontend (after backend tasks):
  Task 5: Handle 7 tiers
  Task 6: Handle negative growth
  Task 7: Wire to real round data (depends on Tasks 1-2)
```

Tasks 1-4 are independent backend changes. Tasks 5-6 are independent frontend fixes that can happen now. Task 7 depends on Tasks 1-2 being deployed.
