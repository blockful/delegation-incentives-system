# @ens-dis/backend

Distribution calculation engine and REST API for the ENS Delegation Incentives Program.

## Overview

This app computes monthly reward distributions for ENS delegates and their delegators. All monetary arithmetic uses BigInt — no floating point anywhere in the computation pipeline.

## Pipeline Steps

1. **Resolve time boundaries** — month start/end, 180-day TWB window, previous month
2. **Fetch proposals & votes** — last 10 on-chain proposals
3. **Identify active delegates** — threshold: voted on >= 7 of 10 proposals
4. **Compute MoM growth** — voting power growth determines reward pool tier
5. **Compute delegate AVP** — time-weighted average voting power over the month
6. **Compute delegate rewards** — 10% of pool, pro-rata by AVP, 1% per-entity cap
7. **Fetch delegations** — active delegations to active delegates at month-end
8. **Consolidate wallets** — protocol mappings + known aliases merged to canonical addresses
9. **Compute delegator TWB** — 180-day time-weighted balance for each delegator
10. **Compute delegator rewards** — 90% of pool, pro-rata by TWB, 5% per-entity cap
11. **Apply lottery** — payouts < 1 ENS grouped into ~10 ENS pools, RANDAO-seeded winner selection
12. **Post-computation validation** — invariant checks on totals, caps, and lottery integrity

## Pool Tiers

| MoM Growth | Pool Size | Delegate Cap | Delegator Cap |
|---|---|---|---|
| 0–10% | 5,000 ENS | 50 ENS | 250 ENS |
| 10–20% | 8,000 ENS | 80 ENS | 400 ENS |
| 20–30% | 10,000 ENS | 100 ENS | 500 ENS |
| 30–50% | 15,000 ENS | 150 ENS | 750 ENS |
| 50–75% | 20,000 ENS | 200 ENS | 1,000 ENS |
| 75–100% | 25,000 ENS | 250 ENS | 1,250 ENS |
| 100%+ | 30,000 ENS | 300 ENS | 1,500 ENS |

## API Endpoints

OpenAPI 3.1 spec available at `GET /doc`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/status` | System status (active delegates, cached distributions) |
| `POST` | `/distributions/{month}/compute` | Trigger distribution computation |
| `GET` | `/distributions/{month}` | Get distribution result (JSON) |
| `GET` | `/distributions/{month}/csv` | Download distribution as CSV |
| `GET` | `/delegates/active` | List active delegates |
| `GET` | `/eligibility/{address}` | Check reward eligibility |

## Wallet Consolidation

Before cap calculation, addresses are consolidated:

1. **Protocol mappings** — ERC20MultiDelegate proxies and Hedgey vesting contracts mapped to real owners
2. **Known wallet aliases** — Secondary EOAs mapped to primary address (same entity)
3. **Transitive resolution** — If proxy → wallet-B and wallet-B → wallet-A, proxy resolves to wallet-A

This ensures per-entity caps apply to the combined TWB, and rewards route to the correct address.

## Development

Environment variables are loaded from the project root `.env`. See root `.env.example`.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Start dev server
pnpm dev
```

## Project Structure

```
src/
├── api/           — Hono + Zod OpenAPI routes
├── config.ts      — Tier table, env validation
├── data/          — Repository interfaces + in-memory implementation
├── domain/        — Pure business logic (zero I/O)
│   ├── active-delegates.ts
│   ├── cap-redistribution.ts
│   ├── delegate-rewards.ts
│   ├── delegator-rewards.ts
│   ├── lottery.ts
│   ├── pool-sizing.ts
│   ├── protocol-dedup.ts
│   ├── time-weighted-balance.ts
│   └── types.ts
├── output/        — CSV and JSON serialization
├── pipeline/      — Distribution pipeline orchestration
└── util/          — BigInt math, time helpers, invariants

test/
├── unit/          — Domain module tests
├── integration/   — Pipeline + API tests
└── property/      — Property-based tests (fast-check)
```
