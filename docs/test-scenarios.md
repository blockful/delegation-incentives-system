# Distribution Test Scenarios

This document describes the 7 integration scenario tests in
`packages/domain/test/integration/pipeline.scenarios.test.ts`.

Each scenario proves a specific property of the distribution algorithm
with **exact, hand-calculated expected values** (bigint, no floating point).
These are the highest-confidence tests in the suite — they verify that
millions of dollars will be distributed correctly under concrete conditions.

All time offsets derive from `TWB_WINDOW_SECONDS` so the tests stay valid
if the window length is ever reconfigured.

---

## Tier 0 baseline (used by all scenarios)

| Parameter | Value | Formula |
|-----------|-------|---------|
| Monthly pool | 5 000 ENS | 5% MoM VP growth → Tier 0 |
| Delegate pool | 500 ENS | 10% of 5 000 |
| Delegator pool | 4 500 ENS | 90% of 5 000 |
| Delegate cap | 50 ENS | 1% of 5 000 |
| Delegator cap | 250 ENS | 5% of 5 000 |

The delegate earns a direct payout in every scenario (voted on all 10
proposals, has 5% MoM VP growth). Scenarios vary only the delegator setup.

---

## Scenario 1 — TWB linear proportionality

**Property:** A delegator's reward is proportional to their time-weighted
balance. Holding 2× the ENS earns 2× the reward; holding for half the
window earns half the reward.

**Setup** (totalTWB = 4 500 ENS = delegatorPool → reward = TWB exactly):

| Delegator | Balance | Duration | TWB | Expected reward |
|-----------|---------|----------|-----|-----------------|
| d_full | 100 ENS | Full 180 days | 100 ENS | 100 ENS |
| d_half | 100 ENS | Last 90 days | 50 ENS | 50 ENS |
| d_double | 200 ENS | Full 180 days | 200 ENS | 200 ENS |
| d_buy | 0 → 100 ENS at midpoint | — | 50 ENS | 50 ENS |
| d_sell | 100 → 0 ENS at midpoint | — | 50 ENS | 50 ENS |
| 45 bg delegators | 90 ENS each | Full 180 days | 4 050 ENS total | 90 ENS each |

**d_buy = d_sell** proves midpoint symmetry: buying at the midpoint and
selling at the midpoint produce identical TWBs (both = 50 ENS).

**Invariants asserted:**
- `r_double = 2 × r_full`
- `r_full = 2 × r_half`
- `r_buy = r_sell = r_half`

---

## Scenario 2 — Cap redistribution (whale)

**Property:** When a delegator's raw reward exceeds the per-delegator cap
(250 ENS), the excess is redistributed pro-rata to uncapped recipients in
successive rounds until convergence.

**Setup:**

| Delegator | TWB | Raw reward | Final reward |
|-----------|-----|-----------|--------------|
| whale | 2 000 ENS | (2000/3000) × 4500 = 3 000 ENS | **250 ENS** (capped) |
| 50 minnows | 20 ENS each | (20/3000) × 4500 = 30 ENS (below cap) | **85 ENS** each |

**Round 1:** whale raw = 3 000 → capped at 250. Excess = 2 750 ENS.
**Round 2:** each minnow gets 30 + (20/1 000) × 2 750 = 30 + 55 = 85 ENS. No new caps.
**Total distributed:** 250 + 50 × 85 = 4 500 ENS (full delegator pool, zero dust).

**Invariant asserted:** `sum(all rewards) = delegatorPool`

---

## Scenario 3 — Delegation timestamp is irrelevant

**Property:** When a delegator becomes eligible (their latest delegation
at `monthEnd` points to an active delegate), their reward depends only on
their ENS *balance history*, not on when they delegated.

**Setup:**

| Delegator | ENS balance | Delegation date |
|-----------|-------------|-----------------|
| d_early | 500 ENS, full window | 180 days before monthEnd |
| d_late | 500 ENS, full window | 1 day before monthEnd |

Both have identical TWB (500 ENS). Both hit the delegatorCap.

**Expected reward:** 250 ENS each (delegatorCap).

---

## Scenario 4 — Switched/never delegation excluded

**Property:** A delegator whose *most recent* delegation at `monthEnd`
points to an *inactive* delegate (or who never delegated) receives zero
reward.

**Setup:**

| Delegator | Balance | Delegation | Result |
|-----------|---------|------------|--------|
| d_loyal | 200 ENS, full window | Points to active delegate | Receives cap (250 ENS) |
| d_switch | 200 ENS, full window | Switched to inactive before monthEnd | **Zero** |
| d_never | 200 ENS, full window | Never delegated | **Zero** |

d_switch is excluded even though they previously delegated to an active
delegate — only the *latest* event matters.

---

## Scenario 5 — Protocol wallet consolidation

**Property:** When a protocol maps proxy addresses to an owner address,
all proxy TWBs are merged into the owner before cap enforcement. The
combined reward goes to the owner; the proxy never appears in payouts.

**Setup:**

| Address | Balance | Duration | TWB | Mapping |
|---------|---------|----------|-----|---------|
| owner-x | 50 ENS | Full 180 days | 50 ENS | canonical (owner) |
| proxy-addr | 50 ENS | Full 180 days | 50 ENS | → owner-x |
| 44 bg delegators | 100 ENS each | Full 180 days | 4 400 ENS total | none |

**After consolidation:** owner-x weight = 100 ENS TWB. Combined reward = 100 ENS < cap.

**Assertions:**
- `proxy-addr` does NOT appear in any payout (direct or lottery)
- `owner-x` receives 100 ENS

**This also proves** that cap enforcement runs on the consolidated entity.
If both wallets had 400 ENS each (800 ENS combined > cap), the owner still
only receives `delegatorCap` once — not 2× capped.

---

## Scenario 6 — Sub-threshold reward enters lottery

**Property:** A delegator whose computed reward is below `MIN_PAYOUT_THRESHOLD`
(1 ENS) does not receive a direct payout. Instead, their reward enters a
lottery pool where one winner takes the combined prize.

**Key design detail:** The lottery requires ≥ 2 entries per pool. A
single sub-threshold delegator is *promoted* to a direct payout (no
randomness needed). This test uses 5 micro-holders to form a multi-entry pool.

**Setup:**

| Delegator | Balance | Duration | TWB | Reward | Route |
|-----------|---------|----------|-----|--------|-------|
| d_big | 10 000 ENS | Full 180 days | 10 000 ENS | 250 ENS (capped) | Direct payout |
| d_tiny + 4 siblings | 1 ENS | Last 1 day | ≈ 0.0056 ENS | ≈ 0.005 ENS (< 1 ENS) | Lottery pool |
| 45 bg delegators | 100 ENS | Full 180 days | 4 500 ENS total | ≈ 94 ENS | Direct payout |

**Why backgrounds are needed:** Cap redistribution flows pro-rata to
**all uncapped delegators** across the entire delegator pool — not
per-delegate. With only d_big + d_tiny in the system, after d_big is
capped the remaining pool (4 250 ENS) is split among still-uncapped
recipients: just d_tiny. So d_tiny absorbs the full remaining pool
(4 250 ENS → capped at 250 ENS). The 45 background delegators
(4 500 ENS TWB total) provide other uncapped recipients, so d_tiny's
pro-rata share of the redistributed excess stays ≈ 0.005 ENS.

**Assertions:**
- d_tiny is NOT in `directPayouts`
- d_tiny IS in `lotteryPools` with `originalAmount < 1 ENS`
- d_big receives `delegatorCap` = 250 ENS
- Every lottery pool has a valid winner (winner address is one of the entries)

---

## Scenario 7 — Fractional window holding (exact TWB)

**Property:** Holding for a fraction `f` of the 180-day window with
balance `B` produces TWB = `B × f`, exactly. The reward ratio between
two delegators equals the ratio of their holding durations.

**Setup** (totalTWB = 4 500 ENS = delegatorPool → reward = TWB exactly):

| Delegator | Balance | Entry point | Holding fraction | TWB | Reward |
|-----------|---------|-------------|-----------------|-----|--------|
| d_1day | 360 ENS | WINDOW − WINDOW/180 (1 day before end) | 1/180 | 2 ENS | 2 ENS |
| d_quarter | 360 ENS | WINDOW − WINDOW/4 (45 days before end) | 1/4 | 90 ENS | 90 ENS |
| d_third | 360 ENS | WINDOW − WINDOW/3 (60 days before end) | 1/3 | 120 ENS | 120 ENS |
| 17 bg delegators | 248 ENS each | Pre-window | 1 | 4 216 ENS | 248 ENS each |
| 1 bg delegator | 72 ENS | Pre-window | 1 | 72 ENS | 72 ENS |

All background TWBs are < 250 ENS → no capping occurs → exact bigint division.

**Why 360 ENS?** Chosen so that 360 × (1/180) = 2, 360 × (1/4) = 90, 360 × (1/3) = 120 are all whole numbers — no integer truncation error.

**WINDOW = 180 × 86 400 = 15 552 000 seconds** is divisible by 180, 4, and 3, so `WINDOW/180`, `WINDOW/4`, `WINDOW/3` are exact integer seconds.

**Exact reward assertions:**
```
d_1day    reward = 2 ENS
d_quarter reward = 90 ENS
d_third   reward = 120 ENS
```

**Ratio invariants (exact bigint equality):**
```
r_third  = 60 × r_1day   (60 days : 1 day)
r_quarter = 45 × r_1day  (45 days : 1 day)
r_third × 3 = r_quarter × 4  (60 days : 45 days = 4:3)
```

---

## Why exact scenarios matter

The existing `pipeline.test.ts` uses approximate assertions (`toBeLessThanOrEqual`,
`toBeGreaterThan(0)`). Those tests verify the pipeline runs without errors and
stays within bounds — but they cannot detect a factor-of-2 error in the reward
formula, a wrong pool split percentage, or an off-by-one in the cap redistribution.

The scenario tests caught two design errors during development:

1. **Scenario 6 (redistribution dilution):** A naive "big + tiny" setup caused
   the cap redistribution to funnel all excess to d_tiny. Cap redistribution
   is global — excess flows pro-rata to every still-uncapped delegator in the
   program, across all active delegates. With only two delegators, d_tiny was
   the sole remaining recipient and absorbed the full 4 250 ENS, getting
   capped at 250 ENS. Adding 45 background delegators provides enough other
   uncapped recipients to keep d_tiny's share below threshold.

2. **Scenario 7 (cascade capping):** A single whale holding 4 288 ENS TWB gets
   capped at 250 ENS. The redistributed excess (4 038 ENS) then cascades through
   d_quarter and d_third (both get capped), until finally d_1day absorbs
   everything and also hits the cap. All four delegators end up at 250 ENS —
   exact rewards are unverifiable. The fix was to split the background TWB across
   18 delegators (each < 250 ENS) so no capping occurs and arithmetic is exact.

These aren't bugs in the production code — the redistribution algorithm behaved
correctly in both cases. They're **emergent behaviors** that only become visible
when you work through the exact arithmetic. Writing exact-value tests forces that
level of understanding.
