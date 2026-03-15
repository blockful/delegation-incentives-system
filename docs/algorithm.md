# Incentives Algorithm

This document is the source of truth for how the ENS Delegation Incentives System computes monthly reward distributions. All logic lives in `packages/domain/src/` and is framework-independent.

## Overview

Each month, a reward pool of 5,000–30,000 ENS is distributed to:

- **Delegates** (10% of pool) — addresses that voted on ≥ 7 of the last 10 governance proposals, weighted by their 30-day time-weighted average voting power (AVP).
- **Delegators** (90% of pool) — holders who delegated to an active delegate, weighted by their 180-day time-weighted balance (TWB).

The pool size is determined by month-over-month growth in aggregate delegated voting power.

---

## Pipeline Steps

The pipeline is implemented in `packages/domain/src/pipeline.ts` and triggered automatically on the first `GET /distributions/{month}` request after the month ends.

### Step 1 — Time boundaries

```
monthStart     = first second of the calendar month (UTC)
monthEnd       = last second of the calendar month (UTC)
prevMonthEnd   = last second of the previous calendar month
twbWindowStart = monthEnd − 180 days   (delegator TWB window)
```

The 180-day TWB window prevents last-minute delegation farming.

### Step 2 — Fetch proposals and votes

The last `PROPOSAL_WINDOW_SIZE = 10` non-active proposals are fetched (executed, defeated, or canceled). All votes cast on those proposals are fetched.

### Step 3 — Identify active delegates

A delegate is **active** if they cast a vote on at least `ACTIVE_VOTE_THRESHOLD = 7` of the 10 proposals.

```
isActive(delegate) = count(votes by delegate in last 10 proposals) >= 7
```

Implemented in `active-delegates.ts`. If no delegates are active, an empty distribution is returned immediately.

### Step 4 — Compute MoM VP growth and select pool tier

The aggregate delegated voting power (AVP) is the sum of each active delegate's latest voting power snapshot at or before each month boundary — a point-in-time measurement, not a time average.

```
currentAVP  = sum of (latest VP snapshot ≤ monthEnd) for each active delegate
previousAVP = sum of (latest VP snapshot ≤ prevMonthEnd) for each active delegate

momGrowthBps = (currentAVP − previousAVP) × 10,000 / previousAVP
```

`momGrowthBps` is a signed value — negative when VP declined. `percentageGrowthBps` in `util/bigint-math.ts` returns a signed bigint.

Point-in-time snapshots are used here (not TWAP) because tier selection should reflect actual VP at the boundary, not a smoothed average. TWAP is reserved for individual delegate reward weighting (Step 5), where smoothing prevents a delegate from being over- or under-rewarded due to VP spikes.

**First-month bootstrap guard**: when `previousAVP === 0` (no prior history), `momGrowthBps` defaults to `0` and tier 0 (lowest) is selected. This prevents a cold-start triggering the top-tier pool.

The pool tier is selected from this table (`config.ts`):

| MoM Growth | Pool Size | Delegate Cap | Delegator Cap |
|---|---|---|---|
| 0 – 10% | 5,000 ENS | 50 ENS | 250 ENS |
| 10 – 20% | 8,000 ENS | 80 ENS | 400 ENS |
| 20 – 30% | 10,000 ENS | 100 ENS | 500 ENS |
| 30 – 50% | 15,000 ENS | 150 ENS | 750 ENS |
| 50 – 75% | 20,000 ENS | 200 ENS | 1,000 ENS |
| 75 – 100% | 25,000 ENS | 250 ENS | 1,250 ENS |
| 100%+ | 30,000 ENS | 300 ENS | 1,500 ENS |

Boundaries are inclusive on the lower bound, exclusive on the upper. Negative growth maps to tier 0.

Pool split: **10% to delegates**, **90% to delegators**.

### Step 5 — Delegate average voting power (AVP)

For each active delegate, their individual average voting power over the calendar month is computed using TWAP:

```
delegateAVP = TWAP of delegate VP over [monthStart, monthEnd]
```

This is implemented via `getVotingPowerHistory` + TWAP integration in the pipeline. The TWAP smooths out VP spikes, preventing a delegate from being over- or under-rewarded if their VP changed sharply during the month. This is distinct from Step 4, which uses point-in-time VP snapshots at month boundaries for tier selection.

The `DelegateScore` for each delegate records `averageVotingPower`, `proposalsVoted`, and `isActive`.

### Step 6 — Delegate reward allocation

The delegate sub-pool (`poolSize × 10%`) is allocated pro-rata by AVP with per-entity caps and iterative redistribution.

```
delegateSubPool = poolTier.poolSize × 10%

raw_share(delegate) = delegateAVP(delegate) / sum(delegateAVP) × delegateSubPool
```

Cap enforcement is iterative (see [Cap Redistribution](#cap-redistribution) below). The per-delegate cap is `poolTier.delegateCap` (e.g., 100 ENS at tier 3).

### Step 7 — Fetch active delegations

All delegations to active delegates as of `monthEnd` are fetched from `DelegationAdapter`. The query returns each delegator's **latest** delegation event at or before `monthEnd`. Only delegators whose most recent delegation pointed to an active delegate are included — this correctly excludes delegators who switched away mid-month.

### Step 8 — Fetch protocol mappings and wallet aliases

Protocol mappings (proxy addresses → operator) and wallet aliases (secondary EOAs → primary address) are fetched. These are used in the consolidation step.

### Step 9 — Delegator time-weighted balance (TWB)

For each eligible delegator, their 180-day time-weighted balance is computed:

```
TWB = ∫[twbWindowStart, monthEnd] balance(t) dt / (monthEnd − twbWindowStart)
```

In discrete form (step function over balance change events):

```
TWB = SUM_i( balance_i × (t_{i+1} − t_i) ) / windowSeconds
```

Implemented in `time-weighted-balance.ts` using the same TWAP algorithm as `util/twap.ts`. The opening balance (at `twbWindowStart`) is determined by the last event before the window — if no event exists, the opening balance is `0` (the account had no tokens yet).

A delegator with no balance events in or before the window gets `TWB = 0` and is excluded from rewards.

### Step 10 — Wallet consolidation (protocol deduplication)

Before cap calculation, addresses that represent the same economic entity are merged. Two classes:

**Protocol mappings** (from indexer, `protocol_mapping` table):
- ERC20MultiDelegate positions: the proxy contract address is mapped to the operator (token holder)
- Hedgey vesting plans: the vesting contract is mapped to the plan recipient

**Wallet aliases** (operator-managed, `wallet_alias` table):
- Secondary EOAs known to belong to the same entity, mapped to a primary address

Resolution is transitive: if address A → B and B → C, then A resolves to C. After resolution, TWBs for the same canonical address are summed before cap enforcement. Rewards are sent to the canonical (primary) address.

Implemented in `protocol-dedup.ts` (`consolidateDelegators`).

### Step 11 — Delegator reward allocation

The delegator sub-pool (`poolSize × 90%`) is allocated pro-rata by consolidated TWB with per-entity caps.

```
delegatorSubPool = poolTier.poolSize × 90%

raw_share(delegator) = TWB(delegator) / sum(TWB) × delegatorSubPool
```

Same cap redistribution algorithm as delegates. Per-delegator cap is `poolTier.delegatorCap` (e.g., 500 ENS at tier 3).

### Step 12 — Lottery for sub-threshold payouts

Any allocation below `MIN_PAYOUT_THRESHOLD = 1 ENS` enters a weighted lottery instead of a direct payout. Entries are grouped into pools targeting ~`LOTTERY_TARGET_POOL_SIZE = 10 ENS`.

**Winner selection**: deterministic weighted random using the RANDAO value from the last block of the month as the seed. Each entry's weight equals its original reward amount — larger sub-threshold allocations have proportionally higher win probability.

```
winner = weightedRandom(entries, seed=RANDAO)
```

Implemented in `lottery.ts`. The RANDAO seed makes results reproducible and verifiable on-chain.

### Step 13 — Post-computation validation

Invariants are asserted before the result is stored:
- Total distributed ≤ pool size
- No individual payout exceeds the relevant cap
- All lottery winners are valid entries

---

## Cap Redistribution

Implemented in `cap-redistribution.ts`. The algorithm is iterative:

1. Compute raw pro-rata shares for all participants.
2. Identify participants whose share exceeds their cap.
3. Cap those participants and redistribute their excess pro-rata among the remaining uncapped participants.
4. Repeat until no participant exceeds their cap (convergence is guaranteed — each iteration reduces the uncapped set).
5. Any rounding remainder (dust from integer division) is added to the largest uncapped recipient.

This ensures the full pool is distributed without any participant receiving more than their cap.

---

## TWAP (Time-Weighted Average)

Implemented in `util/twap.ts`. Used for both delegate AVP and delegator TWB.

Given a step function defined by `(timestamp, value)` snapshots sorted ascending, and a window `[from, to]`:

```
TWAP = (1 / window) × ∫[from, to] value(t) dt
```

Where `value(t)` is the snapshot value holding until the next snapshot. The "opening" value at `from` is the latest snapshot with `timestamp ≤ from`; if none exists, the opening value is `0` (the account had nothing yet).

```
accumulated = 0
prevTime = from
currentValue = latestSnapshotAt(from) or 0

for each snapshot s with s.timestamp > from:
    accumulated += currentValue × (s.timestamp − prevTime)
    currentValue = s.value
    prevTime = s.timestamp

accumulated += currentValue × (to − prevTime)
TWAP = accumulated / (to − from)
```

All arithmetic is integer (bigint). Results are truncated (floor division), not rounded.

---

## Type System

All monetary values use BigInt with TypeScript branded types to prevent unit mixing at compile time.

| Type | Unit | Constructor |
|------|------|-------------|
| `Wei` | Token amounts (1 ENS = 10¹⁸ wei) | `wei(n)` |
| `Seconds` | Unix timestamps | `seconds(n)` |
| `WeiSeconds` | TWAP intermediate | `weiSeconds(n)` |
| `BasisPoints` | Percentages × 100 (500 bps = 5%) | `basisPoints(n)` |

Key constants:

```typescript
ONE_ENS = 10n ** 18n              // 1 ENS in wei
TWB_WINDOW_SECONDS = 180 * 86400  // 180 days (delegator TWB window)
ACTIVE_VOTE_THRESHOLD = 7
PROPOSAL_WINDOW_SIZE = 10
MIN_PAYOUT_THRESHOLD = 1 ENS
LOTTERY_TARGET_POOL_SIZE = 10 ENS
```
