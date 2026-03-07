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

---

## Resources

### API Endpoints

The backend exposes an OpenAPI 3.1 spec at `GET /doc`. All endpoints are defined with Zod schemas for request/response validation.

| Method | Path | Tag | Description |
|--------|------|-----|-------------|
| `GET` | `/health` | System | Returns `{"status": "ok"}` |
| `GET` | `/status` | System | Active delegate count, proposal count, cached distribution months |
| `POST` | `/distributions/{month}/compute` | Distributions | Trigger the 12-step pipeline for a `YYYY-MM` month |
| `GET` | `/distributions/{month}` | Distributions | Fetch a previously computed distribution (JSON) |
| `GET` | `/distributions/{month}/csv` | Distributions | Download a distribution as a CSV file |
| `GET` | `/delegates/active` | Delegates | List addresses that voted on >= 7 of the last 10 proposals |
| `GET` | `/eligibility/{address}` | Eligibility | Check whether an address is an active delegate or delegator to one |
| `GET` | `/doc` | — | OpenAPI 3.1 JSON spec |

#### Example: Compute a distribution

```bash
curl -X POST http://localhost:3000/distributions/2025-03/compute
```

```json
{
  "month": "2025-03",
  "totalDistributed": "15000000000000000000000",
  "activeDelegateCount": 42,
  "eligibleDelegatorCount": 1250,
  "directPayoutCount": 980,
  "lotteryPoolCount": 27
}
```

#### Example: Fetch distribution results

```bash
curl http://localhost:3000/distributions/2025-03
```

```json
{
  "month": "2025-03",
  "metadata": {
    "totalDistributed": "15000000000000000000000",
    "totalDistributedEns": "15000.0",
    "poolTier": {
      "momGrowthMinBps": "3000",
      "momGrowthMaxBps": "5000",
      "poolSize": "15000000000000000000000",
      "delegateCap": "150000000000000000000",
      "delegatorCap": "750000000000000000000"
    },
    "momGrowthBps": "3500",
    "activeDelegateCount": 42,
    "eligibleDelegatorCount": 1250,
    "computedAt": "2025-04-01T12:00:00.000Z",
    "randaoSeed": "98765..."
  },
  "directPayouts": [
    { "address": "0x...", "amount": "1000000000000000000", "amountEns": "1.0", "role": "delegate" }
  ],
  "lotteryPools": [
    {
      "totalPrize": "10000000000000000000",
      "totalPrizeEns": "10.0",
      "winner": "0x...",
      "entries": [
        { "address": "0x...", "originalAmount": "500000000000000000", "role": "delegator" }
      ]
    }
  ]
}
```

#### Example: Check eligibility

```bash
curl http://localhost:3000/eligibility/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "isActiveDelegate": true,
  "isDelegatorToActiveDelegate": false,
  "eligible": true,
  "delegatedTo": null
}
```

### Distribution Pipeline (13 Steps)

The core computation is orchestrated by `distribution-pipeline.ts`. Each month's distribution runs through these steps in sequence:

| Step | Module | What it does |
|------|--------|-------------|
| 1 | `time.ts` | Resolve time boundaries — month start/end, 180-day TWB window, previous month timestamps |
| 2 | Data layer | Fetch the last 10 on-chain proposals and all votes cast on them |
| 3 | `active-delegates.ts` | Identify active delegates — those who voted on >= 7 of the 10 proposals |
| 4 | `pool-sizing.ts` | Compute MoM aggregate voting power growth (basis points) and select the reward pool tier |
| 5 | `time-weighted-balance.ts` | Compute each active delegate's average voting power over the month |
| 6 | `delegate-rewards.ts` | Allocate the delegate sub-pool (10%) pro-rata by AVP, applying per-entity caps |
| 7 | Data layer | Fetch all active delegations to active delegates at month-end |
| 8 | Data layer | Fetch protocol mappings and wallet aliases for address deduplication |
| 9 | `time-weighted-balance.ts` | Compute 180-day time-weighted balance for each eligible delegator |
| 10 | `protocol-dedup.ts` | Consolidate wallets — merge proxy/contract and EOA aliases to canonical addresses, combining TWBs |
| 11 | `delegator-rewards.ts` | Allocate the delegator sub-pool (90%) pro-rata by consolidated TWB, applying per-entity caps |
| 12 | `lottery.ts` | Group payouts < 1 ENS into ~10 ENS lottery pools with RANDAO-seeded winner selection |
| 13 | `invariant.ts` | Post-computation validation — total <= pool, caps respected, lottery winners valid |

### Domain Concepts

#### Active Delegates

A delegate is "active" if they voted on **at least 7 out of the last 10** on-chain governance proposals. Only active delegates (and their delegators) are eligible for incentive rewards.

#### Month-over-Month (MoM) Growth

The system measures the growth in aggregate delegated voting power from the end of the previous month to the end of the current month, expressed in **basis points** (100 bps = 1%). This growth rate determines which reward pool tier applies.

#### Pool Tiers

| MoM Growth | Pool Size | Delegate Cap (1%) | Delegator Cap (5%) |
|---|---|---|---|
| 0–10% | 5,000 ENS | 50 ENS | 250 ENS |
| 10–20% | 8,000 ENS | 80 ENS | 400 ENS |
| 20–30% | 10,000 ENS | 100 ENS | 500 ENS |
| 30–50% | 15,000 ENS | 150 ENS | 750 ENS |
| 50–75% | 20,000 ENS | 200 ENS | 1,000 ENS |
| 75–100% | 25,000 ENS | 250 ENS | 1,250 ENS |
| 100%+ | 30,000 ENS | 300 ENS | 1,500 ENS |

The monthly pool is split **10% to delegates** and **90% to delegators**.

#### Time-Weighted Balance (TWB)

A delegator's reward weight is their 180-day time-weighted balance, not a point-in-time snapshot. This prevents last-minute delegation farming.

```
TWB = SUM(balance_i * seconds_i) / total_seconds
```

Delegates use the same algorithm to compute their average voting power (AVP) over the month.

#### Cap Redistribution

Rewards are allocated pro-rata by weight, but each recipient has a per-entity cap. When a recipient hits their cap, the excess is redistributed to remaining uncapped recipients. This process iterates until convergence. Dust (rounding remainder) goes to the largest uncapped recipient.

#### Wallet Consolidation

Before cap calculation, the system merges addresses that represent the same entity:

- **Protocol mappings** — proxy/contract addresses (from ERC20MultiDelegate, Hedgey vesting) mapped to their operator/owner
- **Wallet aliases** — secondary EOAs known to belong to the same entity, mapped to a primary address

Transitive resolution is supported: if A maps to B and B maps to C, A resolves to C. This ensures caps are applied per-entity, not per-address.

#### Lottery

Payouts below **1 ENS** are grouped into lottery pools of approximately **10 ENS** each. A deterministic winner is selected per pool using weighted random selection seeded by the **RANDAO value** from the last block of the month. Each entry's weight equals its original reward amount, so larger sub-threshold payouts have a proportionally higher chance of winning.

### Data Layer

The backend defines 8 repository interfaces (in `data/interfaces.ts`) composing a single `IncentivesDataSource`. Implementations can be backed by PostgreSQL (via Drizzle), GraphQL, or in-memory data for testing.

| Repository | Key Methods |
|---|---|
| `ProposalRepository` | `getRecentProposals(count)` |
| `VoteRepository` | `getVotesForProposals(proposalIds)` |
| `VotingPowerRepository` | `getVotingPowerHistory(accountIds, from, to)`, `getAggregateDelegatedPower(delegateIds, at)`, `getVotingPower(accountIds)` |
| `BalanceRepository` | `getBalanceHistory(accountIds, from, to)`, `getBalanceAt(accountId, at)` |
| `DelegationRepository` | `getActiveDelegations(delegateIds, at)`, `getAccountBalances()` |
| `ProtocolMappingRepository` | `getMappings()` |
| `WalletAliasRepository` | `getAliases()` |
| `BlockRepository` | `getRandaoForDate(dateString)` |

### Indexer Schema

The Ponder indexer produces 6 on-chain tables from two Ethereum mainnet contracts:

**ERC20MultiDelegate** (`0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446`, block 18,564,837)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `multi_delegate_proxy` | Proxy address to delegate mapping | `delegate`, `deployer`, `createdAtBlock` |
| `multi_delegate_position` | Current ERC1155 delegation positions | `owner`, `delegate`, `amount` |
| `multi_delegate_transfer` | Historical transfer log | `from`, `to`, `delegate`, `amount`, `timestamp` |

**Hedgey TokenVestingPlans** (`0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C`, block 18,506,969)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `vesting_plan` | Active vesting plans with schedule params | `recipient`, `token`, `amount`, `start`, `cliff`, `rate`, `period` |
| `vesting_redemption` | Redemption event history | `planId`, `amountRedeemed`, `planRemainder` |

**Shared output**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `protocol_mapping` | Maps child addresses to operators (consumed by backend) | `childAddress`, `operatorAddress`, `protocol` |

### Type System

All monetary values use **BigInt** with branded types to prevent unit mixing at compile time:

| Type | Unit | Example |
|------|------|---------|
| `Wei` | Token amounts (1 ENS = 10^18 wei) | `1000000000000000000n` |
| `Seconds` | Unix timestamps | `1711929600n` |
| `WeiSeconds` | Time-weighted balance intermediate | `Wei * Seconds` |
| `BasisPoints` | Percentages on 0–10,000 scale | `500n` (= 5%) |

### External References

- [ENS Governance](https://docs.ens.domains/dao) — ENS DAO governance documentation
- [ERC20MultiDelegate](https://etherscan.io/address/0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446) — Multi-delegation contract on Etherscan
- [Hedgey TokenVestingPlans](https://etherscan.io/address/0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C) — Vesting contract on Etherscan
- [Ponder](https://ponder.sh/) — Event indexing framework
- [Hono](https://hono.dev/) — Web framework used for the API
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM for PostgreSQL
- [viem](https://viem.sh/) — TypeScript Ethereum library

### Testing

```bash
pnpm --filter @ens-dis/backend test           # all tests
pnpm --filter @ens-dis/backend test:watch      # watch mode
pnpm --filter @ens-dis/backend test:coverage   # with coverage
```

Tests are organized by type:

| Directory | Type | What it covers |
|-----------|------|----------------|
| `test/unit/domain/` | Unit | Each domain module (active delegates, cap redistribution, TWB, lottery, etc.) |
| `test/unit/util/` | Unit | BigInt math utilities |
| `test/integration/` | Integration | Full pipeline runs, API route testing |
| `test/property/` | Property-based | Cap redistribution invariants via fast-check |
| `test/fixtures/expected-outputs/` | Fixtures | Reference computation results for regression testing |
