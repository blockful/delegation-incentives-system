# ENS Delegation Incentives System

Monorepo for computing and distributing monthly ENS delegation incentive rewards. Active delegates and their delegators earn pro-rata shares of a tier-based reward pool determined by month-over-month growth in aggregate delegated voting power.

## Architecture

Single-service: Ponder indexes on-chain events and serves REST API endpoints from the same process.

```
packages/
└── domain/          — Pure incentives logic (no framework deps, fully tested)

apps/
├── backend/         — Ponder indexer + Hono REST API
└── frontend/        — Web dashboard (placeholder)
```

## Quick Start

```bash
# 1. Copy env and fill in values
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Run tests
pnpm --filter @ens-dis/domain test
pnpm --filter @ens-dis/backend test

# 4. Start the backend (requires RPC_URL and DATABASE_URL)
pnpm --filter @ens-dis/backend dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `RPC_URL` | Ethereum mainnet RPC (required) |
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `BACKEND_PORT` | API port (default: 42069) |

## API Endpoints

Swagger UI at `GET /docs`. OpenAPI 3.1 spec at `GET /doc`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | `{"status": "ok"}` |
| `GET` | `/delegates/active` | Addresses that voted on ≥ 7 of the last 10 proposals |
| `GET` | `/eligibility/{address}` | Is this address an active delegate or delegator to one? |
| `GET` | `/tiers/progression` | Current tier, VP needed for next tier, all tier thresholds |
| `GET` | `/apy/{address}` | Estimated monthly reward and annualized APY |
| `POST` | `/distributions/{month}/compute` | Run the pipeline for `YYYY-MM` |
| `GET` | `/distributions/{month}` | Fetch a stored distribution (JSON) |
| `GET` | `/distributions/{month}/csv` | Download distribution as CSV |

## Documentation

| Document | Contents |
|---|---|
| [docs/algorithm.md](./docs/algorithm.md) | Full pipeline spec: each step, all formulas, pool tiers, TWB, cap redistribution, lottery |
| [docs/integrations.md](./docs/integrations.md) | Protocol integrations: contracts indexed, events handled, how data feeds the pipeline |
| [OPERATOR.md](./OPERATOR.md) | Operator guide: running a distribution cycle, CSV export, monitoring |

## Tech Stack

- **Indexer & API**: Ponder 0.16, Hono, Zod OpenAPI, Drizzle ORM
- **Domain logic**: Pure TypeScript, zero framework dependencies
- **Arithmetic**: BigInt throughout — no floating point
- **Testing**: Vitest, fast-check (property-based)
- **Package manager**: pnpm workspaces

## Resources

- [ENS Forum — Delegation Incentives Temp Check](https://discuss.ens.domains/t/temp-check-delegation-incentives-program/21824) — original spec
- [ERC20MultiDelegate contract](https://etherscan.io/address/0x3CA5CCC96648d016D41c5aF40eED82202BD019cc)
- [Hedgey TokenVestingPlans contract](https://etherscan.io/address/0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C)
