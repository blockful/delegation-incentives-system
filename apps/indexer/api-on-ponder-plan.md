# Plan: API on Top of Ponder

## Goal

Eliminate the standalone backend server. Build the entire API inside the Ponder
indexer — one service that indexes on-chain data AND serves the REST API. Ponder
gives us `db` (Drizzle) and `publicClients` (viem) for free in API routes.

## Spec reference

[Temp Check — Delegation Incentives Program](https://discuss.ens.domains/t/temp-check-delegation-incentives-program/21824)

---

## Architecture

```
packages/
  domain/                  ← Pure business logic (no I/O, no framework)
    src/
      types.ts             ← Branded BigInt types, domain entities
      active-delegates.ts  ← 7/10 voting threshold (concluded proposals only)
      pool-sizing.ts       ← MoM active-VP growth → pool tier
      time-weighted-balance.ts ← Per-second TWB over configurable window
      delegate-rewards.ts  ← 10% pool, pro-rata AVP, capped 1% of R
      delegator-rewards.ts ← 90% pool, pro-rata 180d TWB, capped 5% of R
      cap-redistribution.ts ← Iterative pro-rata reallocation
      protocol-dedup.ts    ← Merge proxy/contract → operator
      lottery.ts           ← RANDAO-seeded weighted draw, ~10 ENS pools
      invariant.ts         ← Post-computation assertions
      config.ts            ← Pool tiers, constants, thresholds
      interfaces.ts        ← All 9 repository interfaces (incl. DistributionRepository)
      pipeline.ts          ← 13-step distribution orchestrator
    util/
      bigint-math.ts       ← mulDiv, basisPoints, sum, min/max, etc.
      time.ts              ← parseMonth, monthStart/End, previousMonth
      invariant.ts
    package.json           ← "@ens-dis/domain", exports everything

apps/
  indexer/                 ← Ponder indexer + API (single service)
    ponder.config.ts       ← Add ENS Governor contract
    ponder.schema.ts       ← Add governance_proposal, governance_vote tables
    src/
      handlers/
        ensToken.ts        ← Existing: Transfer, DelegateChanged, DelegateVotesChanged
        multiDelegate.ts   ← Existing: ERC20MultiDelegate events
        hedgeyVesting.ts   ← Existing: Hedgey vesting events
        ensGovernor.ts     ← NEW: ProposalCreated, VoteCast, VoteCastWithParams
      api/
        index.ts           ← Hono app with all API routes
        data-source.ts     ← Compose all adapters into IncentivesDataSource
        adapters/          ← One file per repository interface
          ProposalAdapter.ts
          VoteAdapter.ts
          VotingPowerAdapter.ts
          BalanceAdapter.ts
          DelegationAdapter.ts
          ProtocolMappingAdapter.ts
          WalletAliasAdapter.ts
          BlockAdapter.ts
          DistributionAdapter.ts
        output/            ← CSV / JSON serialization (presentation, NOT domain)
          csv-writer.ts
          json-writer.ts
          format.ts
        routes/
          health.ts
          distributions.ts ← GET /distributions, GET|POST /distributions/{month}[/csv]
          delegates.ts
          eligibility.ts
          tiers.ts
          apy.ts
      common/
        ...existing
      scripts/
        seed-aliases.ts    ← CLI: upsert wallet_alias rows from CSV

  frontend/                ← Unchanged
```

**Key principles:**
- Domain logic = pure functions. They receive data, return results. No I/O, no framework.
- Ponder API routes handle I/O and pass data to domain functions.
- Each adapter implements exactly one repository interface (Single Responsibility).
- Presentation concerns (CSV, JSON formatting) live in the API layer, not the domain.

---

## Data sources

### Already indexed (in PostgreSQL via Ponder)

| Table                       | → Domain type          | Repository             |
|-----------------------------|------------------------|------------------------|
| `ens_voting_power_snapshot` | `VotingPowerSnapshot`  | VotingPowerRepository  |
| `ens_balance_event`         | `BalanceEvent`         | BalanceRepository      |
| `ens_balance`               | point-in-time balance  | BalanceRepository      |
| `ens_delegation`            | current delegation     | DelegationRepository   |
| `ens_delegation_event`      | `Delegation`           | DelegationRepository   |
| `protocol_mapping`          | `ProtocolMapping`      | ProtocolMappingRepository |

### To be indexed (add to Ponder)

| Contract         | Address                                      | Events                                        | → Tables                            |
|------------------|----------------------------------------------|-----------------------------------------------|--------------------------------------|
| ENS Governor     | `0x323a76393544d5ecca80cd6ef2a560c6a395b7e3` | `ProposalCreated`, `VoteCast`, `VoteCastWithParams`, `ProposalExecuted`, `ProposalDefeated`, `ProposalCanceled` | `governance_proposal`, `governance_vote` |

> **startBlock: 13533800** — the block after ENS Governor deployment (October 2021).
> Using a later block (e.g. 19M) silently truncates 2+ years of governance history and
> produces incorrect active-delegate calculations for any historical month.

### Managed at request time

| Data   | Source                                                   | Repository      |
|--------|----------------------------------------------------------|-----------------|
| RANDAO | `publicClients.mainnet.getBlock({ blockNumber })` → `mixHash` | BlockAdapter |

### Persisted by the API layer

| Data                  | Table                | Repository           |
|-----------------------|----------------------|----------------------|
| Computed distributions | `distribution_result` | DistributionAdapter |
| Wallet aliases         | `wallet_alias`       | WalletAliasAdapter   |

---

## Canonical ID formats

All IDs that cross the adapter/domain boundary must use a single canonical format.
Inconsistency here causes silent FK mismatches (queries return no rows).

| Field | Canonical format | Example |
|---|---|---|
| `governance_proposal.id` | decimal string of uint256 | `"12345678901234567890"` |
| `governance_vote.id` | `"${proposalId}-${voter}"` | `"123456…-0xabcd…"` |
| `governance_vote.proposal_id` | same decimal string as proposal id | `"12345678901234567890"` |
| All Ethereum addresses | lowercase hex with 0x prefix | `"0xabcdef…"` |

---

## Repository interfaces

All 9 interfaces live in `packages/domain/src/interfaces.ts` and are the only
boundary between the domain pipeline and the infrastructure.

```typescript
interface ProposalRepository {
  // Returns only concluded proposals (end_block ≤ current block at computation time).
  getRecentProposals(limit: number): Promise<Proposal[]>
}

interface VoteRepository {
  getVotesByProposals(proposalIds: string[]): Promise<Vote[]>
}

interface VotingPowerRepository {
  // Returns VP snapshots for an account within [from, to].
  getHistory(account: string, from: Seconds, to: Seconds): Promise<VotingPowerSnapshot[]>
  // Returns sum of latest VP snapshot per delegate, filtered to the provided set,
  // at or before the given timestamp. Used for ACTIVE VP only.
  getAggregateDelegatedPower(delegateAddresses: string[], asOf: Seconds): Promise<Wei>
}

interface BalanceRepository {
  getBalanceHistory(account: string, from: Seconds, to: Seconds): Promise<BalanceEvent[]>
  getBalanceAt(account: string, asOf: Seconds): Promise<Wei>
}

interface DelegationRepository {
  // Returns delegations where delegator was delegated to an active delegate
  // as of asOfTimestamp (looks up ens_delegation_event history, not current state).
  getActiveDelegations(activeDelegates: string[], asOfTimestamp: Seconds): Promise<AccountBalance[]>
}

interface ProtocolMappingRepository {
  getAll(): Promise<ProtocolMapping[]>
}

interface WalletAliasRepository {
  getAll(): Promise<WalletAlias[]>
}

interface BlockRepository {
  // Returns RANDAO (mixHash) of the last block of the given UTC date.
  getRandaoForDate(date: Date): Promise<`0x${string}`>
}

interface DistributionRepository {
  save(month: string, result: DistributionResult): Promise<void>
  load(month: string): Promise<DistributionResult | null>
  list(): Promise<string[]>
}
```

---

## Algorithm mapping (spec → code)

| Spec requirement | Domain module | Critical notes |
|---|---|---|
| Active delegate = voted ≥7/10 on-chain proposals | `active-delegates.ts` | Only **concluded** proposals count (end_block ≤ now) |
| MoM VP growth → pool tier (5k–30k ENS) | `pool-sizing.ts` | Growth = active VP this month vs active VP last month (active delegates only, not all VP) |
| Delegate pool = 10% of R, pro-rata by AVP | `delegate-rewards.ts` | AVP uses `ens_voting_power_snapshot` |
| AVP = time-weighted VP over the month | `time-weighted-balance.ts` | Window = [monthStart, monthEnd] inclusive per-second |
| Per-delegate cap = 1% of R, redistribute excess | `cap-redistribution.ts` | Iterative until convergence |
| Delegator pool = 90% of R, pro-rata by 180d TWB | `delegator-rewards.ts` | Eligibility checked at monthEnd timestamp, not current time |
| TWB = per-second weighted average over 180 days | `time-weighted-balance.ts` | Window = [monthEnd − 180d, monthEnd]; end is last second of the month |
| Per-delegator cap = 5% of R, redistribute excess | `cap-redistribution.ts` | Iterative until convergence |
| Deduplicate franchiser/multi-delegate addresses | `protocol-dedup.ts` | Applied **before** caps |
| Sub-1 ENS → lottery pools of ~10 ENS, RANDAO seed | `lottery.ts` | Threshold = 1e18 Wei |
| RANDAO = mixHash of last block of month (UTC) | `BlockAdapter` | `publicClients.mainnet.getBlock()` → `mixHash` |

**Pipeline step order (must be preserved):**
1. Parse month boundaries → `monthStart`, `monthEnd`
2. Fetch concluded proposals + votes → identify active delegate set
3. Compute aggregate active VP at `monthEnd` (active delegates only)
4. Compute aggregate active VP at previous `monthEnd` (active delegates only)
5. Determine pool tier from MoM growth
6. Compute AVP per active delegate over [monthStart, monthEnd]
7. Compute delegate rewards (10% pool), apply 1%-of-R cap, redistribute
8. Fetch active delegations **as of `monthEnd`** (not current state)
9. Fetch protocol mappings + wallet aliases
10. Consolidate delegators via protocol dedup + alias merge
11. Compute 180d TWB per delegator (window end = `monthEnd`)
12. Compute delegator rewards (90% pool), apply 5%-of-R cap, redistribute
13. Run lottery for entries < 1 ENS
14. Post-computation invariant assertions

---

## Phases

### Phase 0 — Extract `packages/domain/`

**Why:** Domain logic must be shared between the indexer API and the existing test
suite. Moving it to a dedicated package avoids circular deps and keeps the
domain framework-agnostic.

**Gate: run `pnpm --filter @ens-dis/backend test` before starting. All tests must
pass. Re-run after every move step. Never proceed with a red bar.**

| Step | Action | Test |
|------|--------|------|
| 0.1 | Create `packages/domain/` with `package.json` (`"@ens-dis/domain"`) | `pnpm --filter @ens-dis/backend test` green |
| 0.2 | Move `apps/backend/src/domain/` → `packages/domain/src/` | Tests still green |
| 0.3 | Move `apps/backend/src/util/` → `packages/domain/src/util/` | Tests still green |
| 0.4 | Move `apps/backend/src/config.ts` → `packages/domain/src/config.ts` | Tests still green |
| 0.5 | Move `apps/backend/src/data/interfaces.ts` → `packages/domain/src/interfaces.ts` | Tests still green |
| 0.6 | Add `DistributionRepository` interface to `packages/domain/src/interfaces.ts` | Tests still green |
| 0.7 | Move `apps/backend/src/pipeline/distribution-pipeline.ts` → `packages/domain/src/pipeline.ts` | Tests still green |
| 0.8 | **Do not move `apps/backend/src/output/`** — move it to `apps/indexer/src/api/output/` instead | Tests still green |
| 0.9 | Update `pnpm-workspace.yaml`: add `"packages/*"` | — |
| 0.10 | Add `"@ens-dis/domain": "workspace:*"` to indexer and backend deps | — |
| 0.11 | Update all imports in backend tests to use `@ens-dis/domain` | `pnpm --filter @ens-dis/backend test` passes |
| 0.12 | Update indexer imports | `pnpm --filter @ens-dis/indexer typecheck` passes |
| 0.13 | Move `apps/backend/test/` → `packages/domain/test/`; delete `apps/backend/` | All tests pass from new location |

> **Note on `output/`:** CSV formatting and JSON serialization are presentation concerns,
> not domain logic. They must not live in `packages/domain`. The domain only returns
> `DistributionResult`; the API layer serializes it.

### Phase 1 — Add ENS Governor indexing

**Why:** The incentives algorithm needs the last 10 concluded on-chain proposals and
all votes cast on them. Indexing them in Ponder makes the data queryable like
everything else.

**TDD first: write the handler unit tests before writing the handler.**

| Step | Action | Test |
|------|--------|------|
| 1.1 | Write unit tests for `ensGovernor.ts` handler (see test cases below) | Tests fail (RED) |
| 1.2 | Add ENS Governor ABI to `ponder.config.ts` (events: `ProposalCreated`, `VoteCast`, `VoteCastWithParams`, `ProposalExecuted`, `ProposalDefeated`, `ProposalCanceled`) | Typecheck |
| 1.3 | Add `governance_proposal` and `governance_vote` tables to `ponder.schema.ts` | Typecheck |
| 1.4 | Create `src/handlers/ensGovernor.ts` | Handler unit tests pass (GREEN) |
| 1.5 | Set `startBlock: 13533800` for ENS Governor in `ponder.config.ts` | `ponder dev` indexes events; verify row count > 10 proposals |

**Handler unit test cases (step 1.1):**
- `ProposalCreated` → inserts row with correct `id` (decimal string), `proposer`, `start_block`, `end_block`, `timestamp`, `description`; initial `status = "active"`
- `VoteCast` → inserts row with id `"${proposalId}-${voter}"`, correct `support` (0/1/2), `weight` as string, `timestamp`
- `VoteCastWithParams` → also inserts a vote row (same table, same logic)
- Duplicate `VoteCast` (same proposalId + voter) → upserts (updates `weight`), does not insert duplicate
- `ProposalExecuted` / `ProposalDefeated` / `ProposalCanceled` → updates `governance_proposal.status` to `"executed"` / `"defeated"` / `"canceled"`

**`governance_proposal` schema:**
```
id             text PK     — proposalId as decimal string (BigInt(id).toString())
proposer       text        — lowercase 0x address
start_block    bigint
end_block      bigint
timestamp      bigint      — block.timestamp of ProposalCreated
description    text
status         text        — "active" | "executed" | "defeated" | "canceled"
```

**`governance_vote` schema:**
```
id             text PK     — `${proposalId}-${voter}` (decimal proposalId, lowercase voter)
proposal_id    text        — FK to governance_proposal (same decimal string format)
voter          text        — lowercase 0x address
support        integer     — 0=Against, 1=For, 2=Abstain
weight         numeric(78,0) — voting power used (stored as string, converted to BigInt in adapter)
timestamp      bigint
```

**Indexes to add to schema:**
```typescript
// In ponder.schema.ts governance_vote table definition:
proposalIdIdx: index().on(table.proposalId),
voterIdx: index().on(table.voter),
```

### Phase 2 — Build adapters

**Why:** The distribution pipeline depends on `IncentivesDataSource` (9 repositories).
We implement each as a focused single-responsibility adapter using Ponder's `db`.

**Test strategy for adapters:** Create a `FakePonderDb` test double in
`test/doubles/fake-ponder-db.ts` that implements the minimal Drizzle query API
(`.select().from().where().orderBy().limit()`). This keeps adapter tests fast and
deterministic without requiring a live Postgres or Ponder runtime.

| Step | Action | TDD |
|------|--------|-----|
| 2.0 | Create `test/doubles/fake-ponder-db.ts` | — |
| 2.1 | **ProposalAdapter** — `SELECT` from `governance_proposal` WHERE `status != "active"` ORDER BY `timestamp DESC` LIMIT N | Test: returns last N concluded proposals sorted by recency; active proposals excluded |
| 2.2 | **VoteAdapter** — `SELECT` from `governance_vote` WHERE `proposal_id IN (...)` | Test: returns votes for given proposal IDs; returns empty array for unknown IDs |
| 2.3 | **VotingPowerAdapter** — `getHistory`: filter by account + [from, to]. `getAggregateDelegatedPower(delegateAddresses, asOf)`: latest snapshot per delegate ≤ asOf, sum — **only for provided delegate addresses** | Test: history filters by range; aggregate sums only active delegates; returns 0n for empty set |
| 2.4 | **BalanceAdapter** — `getBalanceHistory`: filter by account + [from, to]. `getBalanceAt`: latest event ≤ asOf, fallback to `ens_balance` | Test: range filter; point-in-time lookup; fallback to balance table when no events |
| 2.5 | **DelegationAdapter** — `getActiveDelegations(activeDelegates, asOfTimestamp)`: look up `ens_delegation_event` history to find delegation state at asOfTimestamp, **not** the current `ens_delegation` table | Test: returns delegations as of past timestamp; excludes re-delegated-away addresses; returns correct balances |
| 2.6 | **ProtocolMappingAdapter** — `SELECT * FROM protocol_mapping` | Test: returns all rows mapped to domain type |
| 2.7 | **WalletAliasAdapter** — `SELECT * FROM wallet_alias` | Test: returns empty array gracefully when table is empty |
| 2.8 | **BlockAdapter** — use `publicClients.mainnet.getBlock({ blockNumber })` → `mixHash` as RANDAO | Test: mock RPC; verify date → last-block-of-day → `mixHash`; verify `mixHash` is returned verbatim |
| 2.9 | **DistributionAdapter** — upsert to `distribution_result`, load by month, list all months | Test: save then load round-trips correctly; list returns all saved months sorted |
| 2.10 | Compose all adapters in `data-source.ts` | Test: `buildDataSource(db, client)` satisfies `IncentivesDataSource` type |

**`distribution_result` table (add to `ponder.schema.ts`):**
```
month          text PK     — "YYYY-MM"
result_json    text        — JSON.stringify(DistributionResult) with BigInt → string
computed_at    bigint      — Unix timestamp
```

**BigInt conversion rule:** Ponder stores `numeric(78,0)` columns as `string` in
Drizzle results. Every adapter must convert: `wei(BigInt(row.voting_power))`.
Every adapter must normalise addresses: `normalizeAddress(row.voter)`.

### Phase 3 — Build API routes

**Why:** Expose the algorithm results over HTTP with OpenAPI documentation and a
Swagger UI — parity with the existing backend API.

**Shared Zod schemas** (define once, reuse across routes):

```typescript
// Params
const MonthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "must be YYYY-MM")
  .openapi({ param: { name: "month", in: "path" }, example: "2025-03" })

const AddressParam = z.string()
  .openapi({ param: { name: "address", in: "path" }, example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" })

// Reusable sub-schemas
const TierSchema = z.object({
  momGrowthMinBps: z.string(),
  momGrowthMaxBps: z.string(),
  poolSize: z.string(),         // Wei string
  delegateCap: z.string(),      // Wei string
  delegatorCap: z.string(),     // Wei string
})

const PayoutSchema = z.object({
  address: z.string(),
  amount: z.string(),           // Wei string
  amountEns: z.string(),        // human-readable, 4 dp
  role: z.enum(["delegate", "delegator"]),
})

const LotteryEntrySchema = z.object({
  address: z.string(),
  originalAmount: z.string(),   // Wei string
  role: z.enum(["delegate", "delegator"]),
})

const LotteryPoolSchema = z.object({
  totalPrize: z.string(),       // Wei string
  totalPrizeEns: z.string(),
  winner: z.string(),
  entries: z.array(LotteryEntrySchema),
})

const MetadataSchema = z.object({
  totalDistributed: z.string(),
  totalDistributedEns: z.string(),
  poolTier: TierSchema,
  momGrowthBps: z.string(),
  activeDelegateCount: z.number(),
  eligibleDelegatorCount: z.number(),
  computedAt: z.string(),       // ISO 8601
  randaoSeed: z.string(),       // 0x hex
})
```

**OpenAPI app setup:**
```typescript
const app = new OpenAPIHono()

app.doc("/docs/json", {
  openapi: "3.1.0",
  info: {
    title: "ENS Delegation Incentives API",
    version: "1.0.0",
    description:
      "API for computing and querying ENS delegation incentive distributions. " +
      "Handles active delegate identification, pool sizing, reward calculation with " +
      "cap redistribution, and lottery allocation.",
  },
  tags: [
    { name: "System",        description: "Health and status endpoints" },
    { name: "Distributions", description: "Distribution computation and retrieval" },
    { name: "Delegates",     description: "Delegate information" },
    { name: "Eligibility",   description: "Reward eligibility checking" },
    { name: "Tiers",         description: "Pool tier progression and VP requirements" },
    { name: "APY",           description: "Estimated APY for addresses" },
  ],
})

app.get("/docs", swaggerUI({ url: "/docs/json" }))
```

---

**Route specifications:**

#### `GET /health` — tag: System
```typescript
// Response 200
{ status: "ok" }
```
Tests: returns 200; still 200 when DB is slow.

---

#### `GET /status` — tag: System
```typescript
// Response 200
{
  activeDelegateCount: number,
  proposalCount: number,
  cachedDistributions: string[],   // YYYY-MM list from DistributionRepository.list()
}
```
Tests: all counts are non-negative integers; `cachedDistributions` grows after compute.

---

#### `GET /delegates/active` — tag: Delegates
```typescript
// Response 200
{
  count: number,
  delegates: string[],   // lowercase 0x addresses
}
// Response 500
{ error: string }
```
Tests: returns list of concluded-proposal-based active delegates; empty list when no proposals indexed; 500 body contains message on DB error.

---

#### `GET /eligibility/{address}` — tag: Eligibility
```typescript
// Response 200
{
  address: string,
  isActiveDelegate: boolean,
  isDelegatorToActiveDelegate: boolean,
  eligible: boolean,              // isActiveDelegate || isDelegatorToActiveDelegate
  delegatedTo: string | null,     // current delegate of address, or null
}
// Response 500
{ error: string }
```
Tests: active delegate → `{ eligible: true, isActiveDelegate: true }`; delegator to active → `{ eligible: true, isDelegatorToActiveDelegate: true }`; unknown address → `{ eligible: false }` (200, not 404); eligibility check uses **current** delegation state (live view, not historical — this route is informational, not used in distribution computation).

---

#### `GET /distributions` — tag: Distributions
```typescript
// Response 200
string[]   // sorted YYYY-MM list of months with computed distributions
```
Tests: empty array before any compute; contains month after `POST .../compute`.

---

#### `POST /distributions/{month}/compute` — tag: Distributions
```typescript
// Path param: MonthParam
// Response 200
{
  month: string,
  totalDistributed: string,       // Wei string
  activeDelegateCount: number,
  eligibleDelegatorCount: number,
  directPayoutCount: number,
  lotteryPoolCount: number,
}
// Response 400
{ error: string }   // invalid month format
// Response 500
{ error: string }   // pipeline error
```
Tests: 200 with summary on first call; idempotent — second call returns same cached result without re-running pipeline; 400 for `"2026-2"` (missing zero-pad); 400 for `"not-a-month"`; 500 body contains error message if RANDAO RPC fails.

> **Latency note:** Check `DistributionRepository.load(month)` first and return
> immediately on cache hit. Cold-run (first compute) can take several seconds
> due to 947K balance events. Document expected P95 in OpenAPI description.
> If latency becomes unacceptable in production, convert to async (202 + poll).

---

#### `GET /distributions/{month}` — tag: Distributions
```typescript
// Path param: MonthParam
// Response 200
{
  month: string,
  metadata: MetadataSchema,
  directPayouts: PayoutSchema[],
  lotteryPools: LotteryPoolSchema[],
}
// Response 404
{ error: string }   // not computed yet
// Response 400  (automatic from MonthParam validation)
```
Tests: 200 with full DistributionSchema after compute; 404 before compute with helpful message; BigInt fields serialised as strings (no JSON parse errors).

---

#### `GET /distributions/{month}/csv` — tag: Distributions
```typescript
// Path param: MonthParam
// Response 200: text/csv
//   Content-Disposition: attachment; filename="distribution-{month}.csv"
//   Columns: address, amount_wei, amount_ens, role, type (direct|lottery_winner)
// Response 404
{ error: string }
```
Tests: `Content-Type: text/csv`; `Content-Disposition` header present; valid CSV with all 5 expected column headers; 404 if not computed.

---

#### `GET /tiers/progression` — tag: Tiers
```typescript
// Response 200
{
  currentAVP: string,            // Wei — aggregate active VP this month
  previousAVP: string,           // Wei — aggregate active VP last month
  currentGrowthBps: string,      // basis points
  currentGrowthPct: string,      // human-readable, e.g. "12.5"
  currentTierIndex: number,      // 0-6
  activeDelegateCount: number,
  tiers: Array<{
    index: number,
    momGrowthMinPct: string,
    momGrowthMaxPct: string,
    poolSizeEns: string,         // whole ENS, e.g. "5000"
    delegateCapEns: string,
    delegatorCapEns: string,
    isCurrent: boolean,
    isUnlocked: boolean,
    additionalVPNeeded: string,  // Wei — how much more active VP to reach this tier
    requiredAVP: string,         // Wei — total active VP needed
  }>,
}
// Response 500
{ error: string }
```
Tests: exactly 7 tier entries; exactly one `isCurrent: true`; `additionalVPNeeded` is `"0"` for unlocked tiers; `currentTierIndex` matches the `isCurrent` entry.

---

#### `GET /apy/{address}` — tag: APY
```typescript
// Response 200
{
  address: string,
  role: "delegate" | "delegator" | "ineligible",
  delegatedTo: string | null,
  currentTierIndex: number,
  poolSizeEns: string,
  estimatedMonthlyRewardEns: string,   // 4 dp, e.g. "12.3456"
  estimatedApyPct: string,             // 2 dp, e.g. "8.42"
  userWeight: string,                  // Wei — VP (delegate) or TWB (delegator)
  totalPoolWeight: string,             // Wei — total VP or total TWB of all participants
  currentBalanceEns: string,           // 4 dp — current ENS balance
}
// Response 500
{ error: string }
```
Tests: active delegate → `role: "delegate"`, non-zero `estimatedMonthlyRewardEns`; delegator to active → `role: "delegator"`; ineligible address → `role: "ineligible"`, all reward fields `"0"` (200, not 500); `estimatedApyPct` is never negative.

---

**Implementation steps:**

| Step | Action | TDD |
|------|--------|-----|
| 3.1 | Install `@hono/zod-openapi`, `@hono/swagger-ui` in the indexer | — |
| 3.2 | Refactor `src/api/index.ts` to use `OpenAPIHono`; add `/docs/json` + `/docs` Swagger UI | Typecheck |
| 3.3 | Implement `GET /health` | Tests green |
| 3.4 | Implement `GET /status` | Tests green |
| 3.5 | Implement `GET /delegates/active` | Tests green |
| 3.6 | Implement `GET /eligibility/{address}` | Tests green |
| 3.7 | Implement `GET /distributions` | Tests green |
| 3.8 | Implement `POST /distributions/{month}/compute` | Tests green |
| 3.9 | Implement `GET /distributions/{month}` | Tests green |
| 3.10 | Implement `GET /distributions/{month}/csv` | Tests green |
| 3.11 | Implement `GET /tiers/progression` | Tests green |
| 3.12 | Implement `GET /apy/{address}` | Tests green |
| 3.13 | Verify `GET /docs/json` returns valid OpenAPI 3.1 JSON with all 11 routes present | Test: parse spec; count paths |

### Phase 4 — Add `seed-aliases` script

**Why:** `wallet_alias` is permanently empty without a seeding mechanism. Protocol
deduplication via wallet aliases is a no-op in that state.

| Step | Action |
|------|--------|
| 4.1 | Create `apps/indexer/src/scripts/seed-aliases.ts` — reads CSV with columns `secondary,primary`, upserts rows into `wallet_alias` table |
| 4.2 | Add `"seed-aliases": "tsx src/scripts/seed-aliases.ts"` to indexer `package.json` scripts |
| 4.3 | Document usage in README: `pnpm --filter @ens-dis/indexer seed-aliases aliases.csv` |

### Phase 5 — Verify end-to-end

| Step | Action |
|------|--------|
| 5.1 | Run domain unit tests: `pnpm --filter @ens-dis/domain test` |
| 5.2 | Run property-based tests (cap redistribution invariants): `pnpm --filter @ens-dis/domain test -- --reporter=verbose` |
| 5.3 | Start Ponder dev: `pnpm --filter @ens-dis/indexer dev`, wait for Governor sync (13M+ blocks, one-time) |
| 5.4 | `curl /health` → `{ status: "ok" }` |
| 5.5 | `curl /delegates/active` → non-empty list from real indexed data |
| 5.6 | `curl /tiers/progression` → real MoM active-VP growth and tier info |
| 5.7 | `curl -X POST /distributions/2026-02/compute` → first real distribution summary |
| 5.8 | `curl /distributions/2026-02` → cached JSON result |
| 5.9 | `curl /distributions/2026-02/csv` → downloadable CSV |
| 5.10 | `curl /distributions` → `["2026-02"]` |
| 5.11 | `curl -X POST /distributions/2026-02/compute` (again) → same result, no recompute |

### Phase 6 — Clean up

| Step | Action |
|------|--------|
| 6.1 | Confirm `apps/backend/` is fully deleted (all code now lives in `packages/domain` and `apps/indexer`) |
| 6.2 | Update `.env.example` — rename `BACKEND_PORT` → used for Ponder's API port (`PORT` in `ponder.config.ts`); remove any separate backend server port variable |
| 6.3 | Update `README.md` — new architecture diagram, single service, new endpoint URLs |
| 6.4 | Delete `apps/indexer/api-on-ponder-plan.md` (this file, now executed) |

---

## Environment

After this change, the `.env` simplifies to:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ens-dis
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BACKEND_PORT=42069
```

`BACKEND_PORT` is kept and wired into Ponder's port configuration in `ponder.config.ts`
(default 42069). This is the single port the indexer listens on for both the API and
Ponder's internal endpoints.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Governor backfill slow (scanning from block 13.5M, ~2.5 years) | One-time cost; subsequent syncs are incremental and fast |
| Ponder API latency for heavy queries (947K balance events) | Index `governance_vote(proposal_id)`, limit TWB query to 180-day window |
| Distribution computation is CPU-heavy | Return cached result on first `load()` check; compute only on cache miss |
| Ponder restart resets API state | Distributions persisted in `distribution_result` DB table, never in memory |
| RANDAO RPC call fails | `BlockAdapter` retries with exponential backoff; result can be cached in `distribution_result` since RANDAO is immutable once block is finalised |
| Delegator eligibility computed against current state instead of month-end | `DelegationAdapter` queries `ens_delegation_event` history with `asOfTimestamp`; never reads `ens_delegation` current table for this purpose |
| Active VP accidentally includes inactive delegates in pool sizing | `getAggregateDelegatedPower` requires explicit `delegateAddresses[]` parameter; callers must pass the active set |
