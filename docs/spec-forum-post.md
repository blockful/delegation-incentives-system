# ENS DAO Delegation Incentives Program — Temp Check

> **Source:** https://discuss.ens.domains/t/temp-check-delegation-incentives-program/21824
> **Posted by:** blockful (zeugh.eth) — January 20, 2026

---

## TL;DR

ENS proposes a 90-day pilot paying incentives to active voters and their token holders.

Key guardrails:
1. Time-weighted balance factors for token holders capped at 180 days (reduce sybil attacks)
2. 1 ENS minimum payout (avoid inefficient micro-transfers → lottery instead)
3. Per-voter and per-token-holder caps (prevent concentration)

---

## Context

Builds on previous community feedback about incentivizing delegation. Key changes from earlier discussions:
- Success metrics reporting integrated into the program
- Shift from simple holding calculations to time-weighted balance metrics
- Voter rewards now use time-weighted balance over round periods

## Why This Matters

- Increased active voting power raises the cost of capturing governance
- Strong base of active voters reduces reliance on emergency mechanisms
- Incentives reward sustained activity, not specific voting outcomes

---

## Proposal Details

**Duration:** 90 days across three monthly rounds

**Funding:** Up to 90,000 ENS managed by MetaGov stewards; unused funds return to treasury

**Distribution:** Monthly via public snapshots and claimless airdrops

---

## Metric-Based Allocation

Monthly ENS pool size depends on month-over-month (MoM) increase in the **voting power held by active voters (AVP)**:

| VP Increase | Pool (ENS) | Voter Cap | Token-Holder Cap | Approx APY |
|-------------|-----------|-----------|------------------|------------|
| 0 – 10%     | 5,000     | 50        | 250              | ~4%        |
| 10 – 20%    | 8,000     | 80        | 400              | ~5.75%     |
| 20 – 30%    | 10,000    | 100       | 500              | ~6.5%      |
| 30 – 50%    | 15,000    | 150       | 750              | ~9%        |
| 50 – 75%    | 20,000    | 200       | 1,000            | ~10.5%     |
| 75 – 100%   | 25,000    | 250       | 1,250            | ~11.28%    |
| Above 100%  | 30,000    | 300       | 1,500            | —          |

- **Voter cap** = 1% of monthly pool
- **Token-holder cap** = 5% of monthly pool

---

## Eligibility

**Active Voter:** Voted on at least **7 of the last 10** on-chain proposals (rolling window)

---

## Reward Pool Structure

### Voter Pool — 10% of monthly rewards

- Split proportionally by **average voting power held during the month**
- Per-voter cap: 1% of monthly pool
- Excess from capped voters redistributed pro-rata to uncapped voters

### Token-Holder Pool — 90% of monthly rewards

- Distributed to addresses delegated to active voters at distribution cutoff
- Calculated using **180-day time-weighted average ENS balance** (per-second precision, using transfer events)
- Per-token-holder cap: 5% of monthly pool
- Excess redistributed pro-rata within token-holder pool

---

## Time-Weighted Balance Calculation

`TW(i)` = average balance over the 180-day measurement window, accounting for every transfer event on a per-second basis (not daily snapshots).

```
TWB = Σ(balance_i × duration_i) / totalWindowSeconds
```

---

## Minimum Payout & Lottery Mechanism

Payouts **under 1 ENS** are converted to lottery entries:

- Sub-1 ENS amounts pooled into groups approaching 10 ENS
- Each pool awards a single prize via **weighted random draw**
- Weight proportional to original calculated payout amounts
- Randomness source: **RANDAO of the last block of each round (UTC)**
- All formulas and data reproducible from on-chain data

**Example thresholds:**

| Scenario     | Lottery threshold (approx) |
|-------------|---------------------------|
| 4% APY      | < 290 ENS enters lottery   |
| 10% growth  | < 200 ENS enters lottery   |
| 30% growth  | < 125 ENS enters lottery   |

---

## Key Guardrails

- Only on-chain votes count toward active-voter qualification
- No allowlist; self-delegation eligible if criteria met
- No preference for vote direction
- Reward-neutral mechanics (participation + time-weighted balance only)
- **Payout caps applied before small-payout checks and lottery ticketing**
- Franchiser/multi-wallet deduplication: entities using multiple wallets or known protocol contracts (Franchiser vesting, multi-delegate proxies) are consolidated before cap calculation

---

## Supporting Campaign

- 5 ETH sponsored gas for redelegations via `delegateBySig`
- Featured list of qualifying active voters with transparent stats
- Live dashboard: redelegations, active VP growth, distribution countdown

---

## Implementation Details

**Indexing & Data:**
- Tracks proposal participation per voter
- Tracks all delegation events
- Tracks balance changes over time
- Data published monthly as CSV/JSON files
- Full artifacts available and reproducible from on-chain data

**Distribution:**
- Monthly transactions executed by MetaGov multisig
- Lottery draws combined with standard distributions

---

## Tracking Metrics

- Increase in delegated/active supply
- Percentage of rewards subsequently sold
- Delegation stickiness across following months

---

## Key Discussion Points (from thread)

### Technical changes confirmed during discussion

1. **No daily snapshots** — per-second TWB from transfer events (adopted)
2. **RANDAO** as randomness source instead of Chainlink VRF (adopted)
3. **Franchiser deduplication** — dedup receivers when multiple wallets belong to the same operator (adopted)

### On MoM growth logic (zeugh.eth)

> "Monthly reward pool size follows the MoM increase in active delegated VP. So if month 1 is high growth and month 2 is flat, month 2's pool drops accordingly. That's intentional: it pays for security increase, not just being delegated."

### On caps (nick.eth criticism)

Per-voter and per-token-holder caps were described in the thread as "pointless and counterproductive" — trivially circumvented and creating incentives to split tokens across accounts. Response: caps + deduplication together reduce concentration while deduplication prevents naive splitting.

### On whale concentration

> "It pays for getting voting power used. Inactive VP earns zero. The time-weighted balance factor reduces the impact of creating sybils. Caps (1% for delegates, 5% for delegators) further limit concentration on whales."

---

## Timeline

| Date | Milestone |
|------|-----------|
| January 20 | Forum discussion |
| January | Snapshot vote |
| February | Program launch |
| Month 1 | First distribution + results |
| Months 2–3 | Two additional rounds |
| Month 3 | Full evaluation |
