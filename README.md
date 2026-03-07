# ENS Delegation Incentives System

A monorepo for computing and distributing ENS delegation incentive rewards. The system identifies active delegates, calculates reward pools based on month-over-month voting power growth, and distributes rewards proportionally to delegates and their delegators.

## Architecture

```
apps/
├── backend/    — API server + distribution calculation engine
├── indexer/    — Ponder-based on-chain event indexer
└── frontend/   — Web dashboard (placeholder)
```

## Apps

### [Backend](./apps/backend/)

REST API (Hono + Zod OpenAPI) that computes monthly reward distributions. Core features:

- **Active delegate identification** — 7/10 proposal voting threshold
- **Pool sizing** — MoM voting power growth mapped to reward tiers (5k–30k ENS)
- **Cap redistribution** — Iterative pro-rata algorithm with per-entity caps
- **Time-weighted balance** — 180-day TWB for delegator reward weighting
- **Wallet consolidation** — Protocol mappings + known aliases merged before caps
- **Lottery** — Deterministic RANDAO-seeded weighted lottery for small payouts

### [Indexer](./apps/indexer/)

Ponder indexer tracking two Ethereum mainnet contracts:

- **ERC20MultiDelegate** — Multi-delegation proxy positions and ERC1155 balances
- **Hedgey TokenVestingPlans** — Vesting schedules, redemptions, NFT ownership

Produces a `protocol_mapping` table consumed by the backend for address deduplication.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run backend tests
pnpm --filter @ens-dis/backend test

# Start backend dev server
pnpm --filter @ens-dis/backend dev

# Start indexer (requires PONDER_RPC_URL_1)
pnpm --filter @ens-dis/indexer dev
```

## Environment Variables

Copy `.env.example` to `.env` in the relevant app directory.

| Variable | App | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `PORT` | backend | API server port (default: 3000) |
| `PONDER_RPC_URL_1` | indexer | Ethereum mainnet RPC URL |

## Tech Stack

- **Runtime**: Node.js 18+
- **Package manager**: pnpm workspaces
- **Backend**: Hono, Zod OpenAPI, Drizzle ORM, viem
- **Indexer**: Ponder 0.16, viem
- **Testing**: Vitest, fast-check (property-based)
- **All arithmetic**: BigInt (zero floating point)
