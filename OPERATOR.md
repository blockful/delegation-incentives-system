# Operator Guide — ENS Delegation Incentives

This guide covers everything you need to run the incentives program: starting the service, deciding which months to run, triggering computation, reviewing results, and managing wallet data.

---

## Prerequisites

```
PostgreSQL running at DATABASE_URL
Ethereum mainnet RPC (reth or any full node) at RPC_URL
```

`.env` at the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ens-dis
RPC_URL=http://localhost:8545
BACKEND_PORT=3310
```

---

## Starting the service

```bash
pnpm --filter @ens-dis/backend dev     # development (hot reload)
pnpm --filter @ens-dis/backend start   # production
```

The service does two things at once:

1. **Indexes the chain** — backfills ENS token transfers, delegation events, governance votes, and vesting plans from their start blocks. On first run this takes several minutes against a local reth node.
2. **Serves the API** — available immediately at `http://localhost:$BACKEND_PORT`. Endpoints return empty results until indexing catches up.

Check that both are healthy:

```bash
curl http://localhost:3310/health          # Ponder internal health
curl http://localhost:3310/api/health      # {"status":"ok"}
curl http://localhost:3310/delegates/active
```

Swagger UI with all endpoints: `http://localhost:3310/docs`

---

## How cycles work

**There are no hardcoded program dates.** The system computes a distribution for any past configured month, automatically, on first access.

- Computation is **triggered automatically** on the first `GET /distributions/<month>` after the month ends.
- The result is **cached forever** — subsequent requests are served from the database, no recomputation.
- You can force a recompute by deleting the cached record first (see below).

**Practical flow for the 90-day pilot (Feb–Apr 2026):**

At the end of each month, once the chain is fully indexed for that month, simply fetch the distribution:

```bash
curl http://localhost:3310/distributions/2026-02   # triggers compute on first call
curl http://localhost:3310/distributions/2026-03
curl http://localhost:3310/distributions/2026-04
```

Then export the payout list for each month and execute the transfers.

---

## Triggering a distribution

### 1. Fetch (auto-computes on first access)

```bash
curl http://localhost:3310/distributions/2026-03
```

On first call after month-end, the pipeline runs automatically and the result is cached. Returns the full distribution JSON including all payouts and lottery results. Subsequent calls return the cached result instantly.

### 2. Review

```bash
# Full JSON with every address and amount
curl http://localhost:3310/distributions/2026-03

# CSV ready for transfer tooling
curl http://localhost:3310/distributions/2026-03/csv \
  -o distribution-2026-03.csv
```

CSV columns: `address`, `amount_wei`, `amount_ens`, `role` (`delegate` or `delegator`).

Lottery winners are included in the CSV at their prize amount. The original sub-threshold entries they beat are listed in the JSON only (for auditability).

### 3. Verify before paying

Key things to check in the JSON `metadata`:

| Field | What to verify |
|---|---|
| `totalDistributed` | ≤ pool tier's `poolSize` |
| `randaoSeed` | Non-zero (post-merge block was found) |
| `activeDelegateCount` | Looks plausible vs. recent governance activity |
| `computedAt` | After month-end (never compute mid-month) |

### 4. List all computed months

```bash
curl http://localhost:3310/distributions
# ["2026-02","2026-03"]
```

---

## Pool tiers

The monthly pool size is determined by how much the aggregate delegated voting power grew month-over-month:

| MoM Growth | Pool | Delegate cap (per entity) | Delegator cap (per entity) |
|---|---|---|---|
| 0–10% | 5,000 ENS | 50 ENS | 250 ENS |
| 10–20% | 8,000 ENS | 80 ENS | 400 ENS |
| 20–30% | 10,000 ENS | 100 ENS | 500 ENS |
| 30–50% | 15,000 ENS | 150 ENS | 750 ENS |
| 50–75% | 20,000 ENS | 200 ENS | 1,000 ENS |
| 75–100% | 25,000 ENS | 250 ENS | 1,250 ENS |
| 100%+ | 30,000 ENS | 300 ENS | 1,500 ENS |

Split: **10% to active delegates**, **90% to their delegators**.

Check the current tier at any time:

```bash
curl http://localhost:3310/tiers/progression
```

---

## Wallet alias management

Before caps are applied, the system consolidates addresses that belong to the same entity. This prevents a single participant from claiming multiple uncapped slots by splitting across wallets.

**Protocol mappings** (auto-indexed): ERC20MultiDelegate proxy addresses and Hedgey vesting contract addresses are automatically mapped to their operator/owner during indexing. No manual action needed.

**Wallet aliases** (manual): If you know that two EOAs belong to the same entity (e.g. a delegate's hot wallet and cold wallet), insert them into the `wallet_alias` table before running computation.

```sql
INSERT INTO wallet_alias (secondary_address, primary_address, source)
VALUES (
  '0xsecondary...',   -- address to consolidate
  '0xprimary...',     -- canonical address that receives rewards
  'manual-review'     -- audit label
);
```

Aliases are read at compute time. Re-run computation after adding new aliases to incorporate them.

Transitive resolution is supported: if A→B and B→C exist, A resolves to C.

---

## Recomputing a month

Computation is cached forever. To force a recompute (e.g. after adding wallet aliases, or if you suspect stale index data):

```bash
./scripts/force-recompute.sh 2026-03
```

Or directly in SQL:

```sql
DELETE FROM distribution_result WHERE month = '2026-03';
```

The next `GET /distributions/2026-03` will automatically recompute.

---

## Checking eligibility before month-end

You can check whether any address will be eligible for the upcoming month's rewards:

```bash
curl http://localhost:3310/eligibility/0xABCD...
```

```json
{
  "eligible": true,
  "isActiveDelegate": false,
  "isDelegatorToActiveDelegate": true,
  "delegatedTo": "0x..."
}
```

Active delegate status is based on the **last 10 concluded proposals** with a threshold of **7/10 votes**.

---

## Monitoring indexing progress

The Ponder TUI shows indexing progress in the terminal. You can also check the counts in the database directly:

```sql
SELECT COUNT(*) FROM governance_proposal;
SELECT COUNT(*) FROM governance_vote;
SELECT COUNT(*) FROM ens_delegation_event;
```

Do not compute a distribution until the indexer has caught up to (or past) the last block of the target month.
