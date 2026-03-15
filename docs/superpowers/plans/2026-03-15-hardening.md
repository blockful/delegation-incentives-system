# Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven correctness, security, and architecture issues identified in the code review: move the test double out of production code, validate address inputs, guard a non-null assertion, stop leaking error internals, fix a transitive resolution bug, route solo lottery pools to direct payouts, and replace `any` row types with Drizzle inference.

**Architecture:** Each fix is localized — no cross-cutting changes to interfaces or schema. The `InMemoryDataSource` move is the biggest structural change (delete from `src/`, create in `test/doubles/`, update two imports). All other tasks touch one or two files each.

**Tech Stack:** TypeScript, Vitest, viem (`isAddress`), Drizzle ORM (`$inferSelect`), Ponder schema

---

## Task 1: Move InMemoryDataSource to test utilities

`InMemoryDataSource` is a test double. It has no business being in `src/` (production code) or exported as part of the public API.

**Files:**
- Delete: `packages/domain/src/in-memory-datasource.ts`
- Create: `packages/domain/test/doubles/InMemoryDataSource.ts`
- Modify: `packages/domain/src/index.ts` — remove the export
- Modify: `packages/domain/test/integration/pipeline.test.ts` — update import path

- [ ] **Step 1: Create `packages/domain/test/doubles/InMemoryDataSource.ts`**

Copy the entire content of `packages/domain/src/in-memory-datasource.ts` verbatim. Only the file location changes — no logic changes in this step.

```typescript
// packages/domain/test/doubles/InMemoryDataSource.ts
// (same content as packages/domain/src/in-memory-datasource.ts)
```

- [ ] **Step 2: Update the import in `packages/domain/test/integration/pipeline.test.ts`**

Change:
```typescript
import { InMemoryDataSource } from "@/in-memory-datasource.js";
```
To:
```typescript
import { InMemoryDataSource } from "../doubles/InMemoryDataSource.js";
```

- [ ] **Step 3: Remove the export from `packages/domain/src/index.ts`**

Delete this line:
```typescript
// Test doubles
export * from "./in-memory-datasource.js";
```

- [ ] **Step 4: Delete `packages/domain/src/in-memory-datasource.ts`**

```bash
rm packages/domain/src/in-memory-datasource.ts
```

- [ ] **Step 5: Run tests to verify nothing broke**

```bash
pnpm --filter @ens-dis/domain test
pnpm --filter @ens-dis/backend test
```

Expected: all tests pass (the backend tests never imported `InMemoryDataSource`; only domain tests did).

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/ packages/domain/test/
git commit -m "refactor: move InMemoryDataSource to test/doubles — not a production export"
```

---

## Task 2: Validate address params with viem `isAddress`

`AddressParam` in `schemas.ts` accepts any string. An invalid address like `"foo"` passes through and causes undefined behaviour in downstream set lookups and DB queries. viem is already a dependency.

**Files:**
- Modify: `apps/backend/src/api/schemas.ts`
- Modify: `apps/backend/src/api/routes/__tests__/apy.test.ts` — add invalid address test
- Modify: `apps/backend/src/api/routes/__tests__/eligibility.test.ts` — add invalid address test

- [ ] **Step 1: Write failing tests for both routes**

In `apps/backend/src/api/routes/__tests__/apy.test.ts`, add inside `describe("GET /apy/{address}")`:
```typescript
it("returns 400 for invalid address", async () => {
  const req = new Request("http://localhost/apy/not-an-address")
  const res = await apyRouter.fetch(req)
  expect(res.status).toBe(400)
})
```

In `apps/backend/src/api/routes/__tests__/eligibility.test.ts`, add inside the describe block:
```typescript
it("returns 400 for invalid address", async () => {
  const req = new Request("http://localhost/eligibility/not-an-address")
  const res = await eligibilityRouter.fetch(req)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @ens-dis/backend test -- --reporter=verbose 2>&1 | grep "400\|invalid"
```

Expected: both new tests FAIL (currently returns 200 or 500, not 400).

- [ ] **Step 3: Add validation to `AddressParam` in `schemas.ts`**

Add the import at the top of `apps/backend/src/api/schemas.ts`:
```typescript
import { isAddress } from "viem"
```

Change `AddressParam`:
```typescript
export const AddressParam = z
  .string()
  .refine(isAddress, { message: "Invalid Ethereum address" })
  .openapi({
    param: { name: "address", in: "path" },
    example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    description: "Ethereum address (checksummed or lowercase)",
  })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @ens-dis/backend test
```

Expected: all 89+ tests pass including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/schemas.ts apps/backend/src/api/routes/__tests__/
git commit -m "fix: validate address params with viem isAddress"
```

---

## Task 3: Guard the non-null assertion in pipeline.ts

`delegations.find(...)!` on line ~178 of `pipeline.ts` throws a cryptic `Cannot read properties of undefined` if there is ever a mismatch between `allDelegatorIds` and the `delegations` array. This can happen in tests or during data migration.

**Files:**
- Modify: `packages/domain/src/pipeline.ts`

- [ ] **Step 1: Locate the assertion**

Find the block in `pipeline.ts` that looks like:
```typescript
const delegation = delegations.find(
  (d) => d.delegatorId === delegatorId,
)!;
rawDelegatorScores.push({
  delegatorId,
  delegateId: delegation.delegateId,
  timeWeightedBalance: twb,
});
```

- [ ] **Step 2: Replace with a guarded version**

```typescript
const delegation = delegations.find(
  (d) => d.delegatorId === delegatorId,
);
// delegations was fetched for activeDelegates at monthEnd; if somehow
// a delegatorId has no matching record, skip rather than crash.
if (!delegation) continue;

rawDelegatorScores.push({
  delegatorId,
  delegateId: delegation.delegateId,
  timeWeightedBalance: twb,
});
```

- [ ] **Step 3: Run domain tests to verify nothing broke**

```bash
pnpm --filter @ens-dis/domain test
```

Expected: all 107 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/domain/src/pipeline.ts
git commit -m "fix: guard non-null delegation lookup in pipeline — skip orphaned delegators"
```

---

## Task 4: Stop leaking error internals in API routes

All routes currently return `error.message` directly to clients on 500 errors. A DB connection failure exposes the postgres URL; a schema mismatch exposes table names. The fix: log the full error internally, return a generic message to clients.

**Files:**
- Modify: `apps/backend/src/api/helpers.ts`
- Modify: `apps/backend/src/api/routes/apy.ts`
- Modify: `apps/backend/src/api/routes/tiers.ts`
- Modify: `apps/backend/src/api/routes/delegates.ts`
- Modify: `apps/backend/src/api/routes/eligibility.ts`
- Modify: `apps/backend/src/api/routes/distributions.ts`
- Modify: `apps/backend/src/api/routes/health.ts`

- [ ] **Step 1: Replace `errorMessage` helper with a `logAndRespond` pattern**

In `apps/backend/src/api/helpers.ts`, replace:
```typescript
/** Extract error message from unknown catch value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}
```

With:
```typescript
/** Log the full error internally; return a safe message for clients. */
export function internalError(error: unknown): string {
  console.error("[API error]", error)
  return "Internal server error"
}
```

- [ ] **Step 2: Update all route imports and call sites**

In each of the six route files, replace:
```typescript
import { ..., errorMessage } from "../helpers.js"
```
with:
```typescript
import { ..., internalError } from "../helpers.js"
```

And replace every:
```typescript
return c.json({ error: errorMessage(error) }, 500)
```
with:
```typescript
return c.json({ error: internalError(error) }, 500)
```

Files to update: `apy.ts`, `tiers.ts`, `delegates.ts`, `eligibility.ts`, `distributions.ts`, `health.ts`.

- [ ] **Step 3: Update the health test that checks for error text**

Check `apps/backend/src/api/routes/__tests__/health.test.ts` — if any test asserts on the specific error message string, update it to expect `"Internal server error"`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @ens-dis/backend test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/
git commit -m "fix: log errors internally, return generic 500 message to clients"
```

---

## Task 5: Fix transitive address resolution in protocol-dedup

In `protocol-dedup.ts`, the `resolve()` function resolves chains like A → B → C. The bug: when it fetches the next address from the map (`addressMap.get(current)!`), the returned value may not be lowercase. On the next iteration, the lookup for a mixed-case address fails silently and resolution stops one hop early.

**Files:**
- Modify: `packages/domain/src/protocol-dedup.ts`
- Modify: `packages/domain/test/unit/domain/protocol-dedup.test.ts` — add transitive case test

- [ ] **Step 1: Write a failing test**

In `packages/domain/test/unit/domain/protocol-dedup.test.ts`, add a test that exercises a chain where the intermediate address was stored with mixed case:

```typescript
it("resolves transitive chain even when intermediate mapping stored mixed-case", () => {
  const scores: DelegatorScore[] = [
    { delegatorId: "0xchild", delegateId: "0xdelegate", timeWeightedBalance: wei(100n) },
  ]
  // Simulate: child → 0xPROXY (mixed case), 0xproxy → 0xoperator
  const mappings: ProtocolMapping[] = [
    { childAddress: "0xchild", operatorAddress: "0xPROXY", protocol: "test" },
    { childAddress: "0xproxy", operatorAddress: "0xoperator", protocol: "test" },
  ]
  const result = consolidateDelegators(scores, mappings, [])
  expect(result).toHaveLength(1)
  expect(result[0].delegatorId).toBe("0xoperator")
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ens-dis/domain test -- --reporter=verbose 2>&1 | grep "transitive"
```

Expected: FAIL — resolves to `"0xproxy"` instead of `"0xoperator"`.

- [ ] **Step 3: Fix the `resolve` function in `protocol-dedup.ts`**

Change:
```typescript
function resolve(addr: string): string {
  const seen = new Set<string>();
  let current = addr.toLowerCase();
  while (addressMap.has(current) && !seen.has(current)) {
    seen.add(current);
    current = addressMap.get(current)!;
  }
  return current;
}
```

To:
```typescript
function resolve(addr: string): string {
  const seen = new Set<string>();
  let current = addr.toLowerCase();
  while (addressMap.has(current) && !seen.has(current)) {
    seen.add(current);
    current = addressMap.get(current)!.toLowerCase();
  }
  return current;
}
```

The only change is `.toLowerCase()` on the resolved value.

- [ ] **Step 4: Run tests to verify the fix**

```bash
pnpm --filter @ens-dis/domain test
```

Expected: all 108+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/protocol-dedup.ts packages/domain/test/
git commit -m "fix: normalize to lowercase during transitive address resolution"
```

---

## Task 6: Route solo lottery pools to direct payouts

A single-entry lottery pool has no randomness — the winner is always the sole entrant. It should be a direct payout instead. This happens when one sub-threshold entry is larger than `LOTTERY_TARGET_POOL_SIZE` and ends up in its own pool.

**Files:**
- Modify: `packages/domain/src/lottery.ts`
- Modify: `packages/domain/test/unit/domain/lottery.test.ts` — add solo pool test

- [ ] **Step 1: Write a failing test**

In `packages/domain/test/unit/domain/lottery.test.ts`, add:

```typescript
it("routes a solo sub-threshold entry larger than target pool to direct payout", () => {
  const allocations: RewardAllocation[] = [
    // below minThreshold (1 ENS) but larger than targetPoolSize (10 ENS) — impossible
    // by definition. Real case: one entry that forms its own pool because it doesn't
    // fit with others.
    { address: "0xalone", amount: wei(5n * 10n ** 17n), role: "delegator" }, // 0.5 ENS
    { address: "0xbig",   amount: wei(9n * 10n ** 18n), role: "delegator" }, // 9 ENS (sub-threshold, forms solo pool)
  ]
  const result = runLottery(
    allocations,
    ONE_ENS,           // minThreshold = 1 ENS
    ONE_ENS * 10n,     // targetPoolSize = 10 ENS
    42n,
  )
  // 0.5 ENS alone in a pool → direct payout, not lottery
  // 9 ENS alone in a pool → direct payout, not lottery
  expect(result.lotteryPools).toHaveLength(0)
  expect(result.directPayouts.map(p => p.address)).toContain("0xbig")
  expect(result.directPayouts.map(p => p.address)).toContain("0xalone")
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @ens-dis/domain test -- --reporter=verbose 2>&1 | grep "solo"
```

Expected: FAIL — currently creates solo lottery pools.

- [ ] **Step 3: Fix `runLottery` in `lottery.ts`**

After the pool grouping loop (where `pools` is built), add a filter before the `lotteryPools` map:

```typescript
// A single-entry pool has no randomness — promote to direct payout.
const soloEntries: LotteryEntry[] = [];
const multiEntryPools: LotteryEntry[][] = [];
for (const pool of pools) {
  if (pool.length === 1) {
    soloEntries.push(pool[0]);
  } else {
    multiEntryPools.push(pool);
  }
}

// Promote solo entries to direct payouts
for (const entry of soloEntries) {
  directPayouts.push({
    address: entry.address,
    amount: entry.originalAmount,
    role: entry.role,
  });
}

// For each multi-entry pool, draw a weighted random winner
const lotteryPools: LotteryPool[] = multiEntryPools.map((entries, poolIndex) => {
```

Also update the `return` to use `multiEntryPools.map` instead of `pools.map`.

- [ ] **Step 4: Run tests to verify the fix**

```bash
pnpm --filter @ens-dis/domain test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/lottery.ts packages/domain/test/
git commit -m "fix: promote solo lottery pool entries to direct payouts"
```

---

## Task 7: Replace adapter `any` row types with Drizzle inference

Every adapter casts DB rows to `any` and then re-asserts field types manually. Ponder's schema uses Drizzle's `onchainTable`, which supports `$inferSelect` — this gives compile-time types for every row field. With proper types, bigint columns are already `bigint` (no `BigInt()` cast needed), and string columns are already `string` (no `as string` needed).

**Files:**
- Modify: `apps/backend/src/api/adapters/BalanceAdapter.ts`
- Modify: `apps/backend/src/api/adapters/VotingPowerAdapter.ts`
- Modify: `apps/backend/src/api/adapters/DelegationAdapter.ts`
- Modify: `apps/backend/src/api/adapters/VoteAdapter.ts`
- Modify: `apps/backend/src/api/adapters/ProposalAdapter.ts`

The pattern for each adapter:

```typescript
// Before: import the table
import { ensBalanceEvent } from "ponder:schema"

// After: import the table AND infer the row type
import { ensBalanceEvent } from "ponder:schema"
type BalanceEventRow = typeof ensBalanceEvent.$inferSelect
```

Then change `(row: any)` to `(row: BalanceEventRow)` in `.map()` calls. Remove `as string`, `as string | number | bigint`, and unnecessary `BigInt()` casts where the schema column is already typed as `bigint`.

- [ ] **Step 1: Update `BalanceAdapter.ts`**

Add after the `ensBalanceEvent` import:
```typescript
type BalanceEventRow = typeof ensBalanceEvent.$inferSelect
```

In `getBalanceHistory`, change:
```typescript
return rows.map((row: any) => ({
  accountId: (row.accountId as string).toLowerCase(),
  balance: wei(BigInt(row.balance as string | number | bigint)),
  delta: wei(BigInt(row.delta as string | number | bigint)),
  timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
}))
```
To:
```typescript
return (rows as BalanceEventRow[]).map((row) => ({
  accountId: row.accountId.toLowerCase(),
  balance: wei(row.balance),
  delta: wei(row.delta),
  timestamp: seconds(row.timestamp),
}))
```

In `getBalanceAt`, change `eventRows[0].balance as string | number | bigint` to `eventRows[0].balance`.

- [ ] **Step 2: Update `VotingPowerAdapter.ts`**

Add:
```typescript
import { ensVotingPowerSnapshot } from "ponder:schema"
type VPSnapshotRow = typeof ensVotingPowerSnapshot.$inferSelect
```

Update all three methods to use `(rows as VPSnapshotRow[]).map((row) => ...)` with clean field access.

- [ ] **Step 3: Update `DelegationAdapter.ts`**

Add:
```typescript
import { ensDelegationEvent, ensDelegation, ensBalance } from "ponder:schema"
type DelegationEventRow = typeof ensDelegationEvent.$inferSelect
type DelegationRow = typeof ensDelegation.$inferSelect
type BalanceRow = typeof ensBalance.$inferSelect
```

Update all row accesses. Note: `latestByDelegator` map can now be typed as `Map<string, DelegationEventRow>` instead of `Map<string, any>`.

- [ ] **Step 4: Update `VoteAdapter.ts` and `ProposalAdapter.ts`**

Same pattern. Add inferred row types for `governanceVote` and `governanceProposal`.

- [ ] **Step 5: Run tests after all adapter changes**

```bash
pnpm --filter @ens-dis/backend test
```

Expected: all tests pass. TypeScript compilation must also pass — run:
```bash
cd apps/backend && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/adapters/
git commit -m "fix: replace any row casts with Drizzle inferred types in all adapters"
```

---

## Final verification

- [ ] **Run all tests**

```bash
pnpm --filter @ens-dis/domain test && pnpm --filter @ens-dis/backend test
```

Expected: all tests pass.

- [ ] **Push and open PR**

```bash
git push -u origin fix/hardening
gh pr create --title "fix: hardening — address validation, error leakage, type safety, test double relocation" \
  --body "Seven targeted fixes from code review: move InMemoryDataSource to test utilities, validate address params with viem isAddress, guard non-null pipeline assertion, stop leaking error internals in 500 responses, fix transitive address resolution lowercase bug, route solo lottery pools to direct payouts, and replace adapter any casts with Drizzle inferred types."
```
