# Production Hardening Plan — Backend Test & Code Robustness

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the backend to production-readiness for distributing millions in ENS incentives by fixing dead code, adding missing integration scenarios, and strengthening invariant coverage.

**Architecture:** Targeted fixes and test additions across `apps/backend` (handler dead code) and `packages/domain` (new scenarios + property tests). No schema or API changes.

**Tech Stack:** TypeScript, Vitest, fast-check (property tests), Ponder

---

## Task 1: Remove ProposalDefeated dead code

The ENS Governor contract never emits a `ProposalDefeated` event — "defeated" is a passive state determined by the `state()` view function after voting ends. The ABI entry, handler, and test code are dead code that can never fire. Their presence creates false confidence that defeated proposals are tracked.

**Files:**
- Modify: `apps/backend/ponder.config.ts` — remove `ProposalDefeated` from ABI
- Modify: `apps/backend/src/handlers/ensGovernor.ts` — remove handler + registration
- Modify: `apps/backend/tests/handlers/ensGovernor.test.ts` — remove/update tests

## Task 2: Add Scenario 14 — Multi-delegate pool sharing with varying AVP

Current scenarios have 1-2 delegates. This scenario tests 3 delegates with different VP sharing the 10% pool, verifying proportional allocation under per-delegate caps.

**Files:**
- Modify: `packages/domain/test/integration/pipeline.scenarios.test.ts`

## Task 3: Add Scenario 15 — Cascading cap redistribution

Tests the case where redistribution from capped participants causes ANOTHER participant to exceed their cap, triggering a second redistribution round.

**Files:**
- Modify: `packages/domain/test/integration/pipeline.scenarios.test.ts`

## Task 4: Add Scenario 16 — Exact MIN_PAYOUT_THRESHOLD boundary

Verifies that a delegator with reward = exactly 1 ENS (the threshold) receives a direct payout, NOT a lottery entry. This boundary condition is critical for correctness.

**Files:**
- Modify: `packages/domain/test/integration/pipeline.scenarios.test.ts`

## Task 5: Add Scenario 17 — Combined protocol mapping + wallet alias transitive chain

Tests the full consolidation pipeline: protocol mapping (proxy → operator) plus wallet alias (operator → primary), verifying the transitive chain resolves correctly in an integration context.

**Files:**
- Modify: `packages/domain/test/integration/pipeline.scenarios.test.ts`

## Task 6: Add new pipeline property tests

Strengthen invariant coverage with:
- 10%/90% delegate/delegator pool split is respected
- Lottery pool totalPrize = sum of entry originalAmounts
- No address appears in BOTH direct payouts and lottery for the SAME role

**Files:**
- Modify: `packages/domain/test/property/pipeline.prop.test.ts`

## Task 7: Add Scenario 18 — Every participant hits cap (unallocated excess)

When ALL participants hit their cap, the remaining pool is unallocated (returned to treasury). This tests the system's behavior at maximum cap utilization.

**Files:**
- Modify: `packages/domain/test/integration/pipeline.scenarios.test.ts`
