# ENS Delegation Incentives — Backend PRD

**Scope**: Backend algorithm for computing monthly incentive distributions for ENS active voters and their token holders.

**Architecture**: Ponder indexer (indexes 4 contracts via RPC) → PostgreSQL → Hono REST API. Pure domain logic with zero framework dependencies. Distribution triggered by cron calling a script after month-end.

**Pilot**: 3 monthly rounds, configured in repo.

---

## Table of Contents

1. [On-Chain Data Sources](#1-on-chain-data-sources)
2. [Pipeline Steps](#2-pipeline-steps)
3. [API Surface](#3-api-surface)
4. [Output Format](#4-output-format)
5. [Configuration](#5-configuration)
6. [Constants](#6-constants)
7. [Glossary](#7-glossary)

---

## 1. On-Chain Data Sources

Four contracts indexed by Ponder. All data written to PostgreSQL.

> **Note on protocol vs. app terminology.** Event signatures and contract-level fields use the on-chain protocol terms (`delegator`, `delegate`). The pipeline maps those to our app vocabulary at the adapter boundary — see §7 Glossary. The "Used For" column below uses app terms.

### 1.1 ENS Token (`0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72`)

| Event | Indexed State | Used For |
|---|---|---|
| `Transfer(from, to, value)` | Balance history per address (address, balance, delta, timestamp) | Token-holder TWB (Step 10) |
| `DelegateChanged(delegator, fromDelegate, toDelegate)` | Current delegation mapping (token holder → voter) | Eligibility check (Step 8) |
| `DelegateVotesChanged(delegate, previousBalance, newBalance)` | VP history per voter (address, newBalance, timestamp) | TWAP VP (Step 6), VP growth (Step 4) |

### 1.2 ENS Governor (`0x323A76393544d5ecca80cd6ef2A560C6a395b7E3`)

| Event | Indexed State | Used For |
|---|---|---|
| `ProposalCreated(proposalId, proposer, ..., startBlock, endBlock, ...)` | Proposals table (id, status, timestamp, endBlock) | Active-voter calc (Step 3) |
| `VoteCast(voter, proposalId, support, weight, reason)` | Votes table (voter, proposalId, support, weight, timestamp) | Active-voter calc (Step 3) |
| `VoteCastWithParams(voter, proposalId, support, weight, reason, params)` | Same as VoteCast | Active-voter calc (Step 3) |
| `ProposalExecuted(id)` / `ProposalDefeated(id)` / `ProposalCanceled(id)` / `ProposalQueued(id)` | Proposal status update | Finalized proposal filtering (Step 2) |

**Finalized statuses**: executed, defeated, canceled, succeeded, queued, expired.
**Excluded statuses**: pending, active.

### 1.3 ERC20MultiDelegate (`0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446`)

ENS delegation-splitting contract. Users deposit ENS tokens into per-voter proxy contracts and receive ERC1155 receipt tokens. Token ID = `uint256(uint160(voterAddress))`. The ERC1155 balance is the sole proof of ownership.

| Event | Indexed State | Used For |
|---|---|---|
| `TransferSingle(operator, from, to, id, value)` | ERC1155 balance history per (holder, tokenId) | MultiDelegate token-holder TWB (Step 10) |
| `TransferBatch(operator, from, to, ids, values)` | Same, multiple entries per event | MultiDelegate token-holder TWB (Step 10) |
| `ProxyDeployed(delegate, proxy)` | Proxy registry (proxy address → voter address) | Identifying MultiDelegate proxy addresses |

### 1.4 Hedgey Vesting (`0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C`)

Vesting contracts that hold ENS tokens and delegate on behalf of a beneficiary. The beneficiary is the current owner of the plan's ERC721 NFT.

| Event | Indexed State | Used For |
|---|---|---|
| `PlanCreated(planId, recipient, token, amount, ...)` | Vesting plans (planId → contract address, token, amount) | Identifying Hedgey token-holder addresses |
| `Transfer(from, to, tokenId)` (ERC721) | NFT ownership history per planId | Resolving beneficiary at month-end (Step 8) |

---

## 2. Pipeline Steps

Runs once per round month, triggered by cron after month-end.

All monetary values in **Wei** (bigint). No floating point.

All point-in-time state lookups use the **block closest to but not after** the target timestamp.

---

### Step 1: Resolve Round Boundaries

**Input**: `roundMonth` from config (e.g., `"2026-05"`)

**Process**:
- `monthStart` = first second of the month (UTC)
- `monthEnd` = last second of the month (UTC)
- `startBlock` = block closest to but not after `monthStart`
- `endBlock` = block closest to but not after `monthEnd`

**Output**: `monthStart`, `monthEnd`, `startBlock`, `endBlock`

---

### Step 2: Find Last 10 Finalized Proposals

This step runs **twice**: once as of `startBlock` (for VP growth baseline) and once as of `endBlock` (for reward calculation).

**Input**: target block number

**Process**:
1. Query all proposals with status ∈ {executed, defeated, canceled, succeeded, queued, expired}
2. Filter to those where the status-changing event (e.g., `ProposalExecuted`, `ProposalDefeated`) occurred on or before target block
3. Sort by the status-changing event timestamp descending
4. Take the first 10

**Output**: `finalizedProposals` — array of up to 10 proposal IDs

**Edge case**: If fewer than 10 finalized proposals exist, use all available. The active threshold (7) remains fixed — if fewer than 7 proposals exist, no voter can qualify.

---

### Step 3: Determine Active Voters

Runs **twice**: once with proposals from `startBlock` (start-of-month active set), once with proposals from `endBlock` (end-of-month active set).

**Input**: `finalizedProposals` from Step 2

**Process**:
1. For each proposal, query all votes cast
2. For each unique voter address, count how many of the 10 proposals they voted on
3. Active = count ≥ 7

**Output**: `activeVoters` — set of addresses

---

### Step 4: Compute VP Growth

Compares total voting power of active voters between month-start and month-end. Each boundary uses its own active-voter set.

**Input**:
- `activeVotersStart` (from Step 3 at `startBlock`)
- `activeVotersEnd` (from Step 3 at `endBlock`)
- `startBlock`, `endBlock`

**Process**:
1. `vpStart` = sum of VP at `startBlock` for each voter in `activeVotersStart`
   - VP at a block = the most recent `DelegateVotesChanged.newBalance` on or before that block
2. `vpEnd` = sum of VP at `endBlock` for each voter in `activeVotersEnd`
3. `vpGrowthPct` = (`vpEnd` - `vpStart`) / `vpStart` × 100

**Output**: `vpStart`, `vpEnd`, `vpGrowthPct`

**Edge case**: If `vpStart` = 0 (no active voters at month-start), treat growth as 0% (lowest tier).

---

### Step 5: Select Pool Tier

**Input**: `vpGrowthPct` from Step 4

**Tier table**:

| VP Growth | Pool Size (R) | Voter Cap (1% of R) | Token-Holder Cap (5% of R) |
|---|---|---|---|
| 0–10% | 5,000 ENS | 50 ENS | 250 ENS |
| 10–20% | 8,000 ENS | 80 ENS | 400 ENS |
| 20–30% | 10,000 ENS | 100 ENS | 500 ENS |
| 30–50% | 15,000 ENS | 150 ENS | 750 ENS |
| 50–75% | 20,000 ENS | 200 ENS | 1,000 ENS |
| 75–100% | 25,000 ENS | 250 ENS | 1,250 ENS |
| >100% | 30,000 ENS | 300 ENS | 1,500 ENS |

Negative growth maps to the 0–10% tier.

**Output**: `R` (pool size), `voterCap`, `tokenHolderCap`

---

### Step 6: Compute Voter TWAP VP (AVP)

Time-Weighted Average Voting Power for each active voter during the round month. Smooths VP spikes so a last-day delegation surge doesn't grant full-month weight.

**Input**:
- `activeVotersEnd` from Step 3
- `monthStart`, `monthEnd`

**Process** (for each active voter `j`):
1. Query all `DelegateVotesChanged` events for `j` in `[monthStart, monthEnd]`
2. Get the most recent `DelegateVotesChanged` before `monthStart` → this is `j`'s VP at the start of the window
3. Build a step function: VP value at each transition point
4. Compute:

```
TWAP(j) = Σ(VP_i × duration_i) / (monthEnd - monthStart)
```

Where `VP_i` is the voting power during interval `i`, and `duration_i` is the interval's length in seconds. Intervals span from one `DelegateVotesChanged` event to the next (or to `monthEnd`).

**Output**: `voterAVP` — map of address → AVP (bigint, in Wei)

---

### Step 7: Allocate Voter Rewards

**Input**:
- `voterAVP` from Step 6
- `R`, `voterCap` from Step 5

**Process**:
1. `voterSubPool` = 10% of `R`
2. For each active voter `j`:
   ```
   rawReward(j) = AVP(j) / Σ_k AVP(k) × voterSubPool
   ```
3. Iterative cap redistribution:
   - a. Find all voters where `rawReward > voterCap`
   - b. Set their reward to `voterCap`
   - c. Compute excess = sum of (rawReward - voterCap) for capped voters
   - d. Redistribute excess pro-rata to uncapped voters (proportional to their AVP among uncapped voters)
   - e. Repeat from (a) until no voter exceeds the cap

**Output**: `voterRewards` — map of address → reward (bigint, in Wei)

**Invariant**: Sum of all voter rewards = `voterSubPool` (minus dust from integer rounding — assign dust to the largest uncapped allocation for determinism).

---

### Step 8: Identify Eligible Token Holders

All addresses delegated to an active voter at `endBlock`, resolved to their true owner.

**Input**:
- `activeVotersEnd` from Step 3
- `endBlock` from Step 1

**Process** — three sources, merged into one list:

**8a. Direct token holders**:
- Query current delegation state at `endBlock` (from `DelegateChanged` events)
- Include every address whose current `toDelegate` ∈ `activeVotersEnd`

**8b. MultiDelegate positions**:
- For each active voter, compute tokenId = `uint256(uint160(voterAddress))`
- Find all addresses holding ERC1155 balance > 0 for that tokenId at `endBlock` (from `TransferSingle`/`TransferBatch` events)
- Each holder is an eligible token holder; their delegated amount = their ERC1155 balance

**8c. Hedgey vesting**:
- From indexed `PlanCreated` events, build a set of all known vesting contract addresses
- Cross-reference with 8a results: any direct token holder whose address is a known vesting contract is a Hedgey position
- For each matched vesting contract, find the current NFT owner at `endBlock` (from Hedgey `Transfer` ERC721 events, where tokenId = planId)
- Replace the vesting contract address with the NFT owner as `resolvedAddress`

**Output**: `eligibleTokenHolders` — array of:
```
{
  resolvedAddress,    // the true owner
  originalAddress,    // on-chain address (may differ for Hedgey)
  voterAddress,       // which active voter they're delegated to
  source              // "direct" | "multidelegate" | "hedgey"
}
```

---

### Step 9: Consolidate Addresses

Merge entries that resolve to the same person. This prevents cap evasion through proxies or multiple wallets.

**Input**:
- `eligibleTokenHolders` from Step 8
- Wallet aliases config file (JSON: `{ "secondary": "primary" }`)

**Process**:
1. **Apply wallet aliases**: For each entry, if `resolvedAddress` has an alias, replace it with the primary address. Resolve chains transitively (A→B→C becomes A→C).
2. **Merge**: Group all entries by final `resolvedAddress`. Each group becomes one consolidated token holder with multiple source entries.

**Output**: `consolidatedTokenHolders` — map of resolvedAddress → array of source entries

---

### Step 10: Compute Token-Holder TWB

180-day Time-Weighted Balance. Measures average token holdings over the window, penalizing recent acquisitions.

**Input**:
- `consolidatedTokenHolders` from Step 9
- `twbWindowStart` = `monthEnd` − 180 days
- `twbWindowEnd` = `monthEnd`

**Process** (for each consolidated token holder):

For each source entry, compute TWB based on source type:

- **Direct delegation**: Query ENS `Transfer` events for `originalAddress` in `[twbWindowStart, twbWindowEnd]`. Get the most recent balance before `twbWindowStart` as initial value (0 if none).
- **MultiDelegate**: Query ERC1155 `TransferSingle`/`TransferBatch` events for `(originalAddress, tokenId)` in `[twbWindowStart, twbWindowEnd]`. tokenId = `uint256(uint160(voterAddress))`. Get the most recent ERC1155 balance before `twbWindowStart` as initial value (0 if none).
- **Hedgey**: Query ENS `Transfer` events for the **vesting contract address** (`originalAddress`) in `[twbWindowStart, twbWindowEnd]`. Get the most recent balance before `twbWindowStart` as initial value (0 if none). Attributed to whoever owns the NFT at `monthEnd`.

**TWB formula** (same for all sources):

```
TWB = Σ(balance_i × duration_i) / totalWindowSeconds
```

Where:
- `totalWindowSeconds` = 180 × 24 × 3600 = 15,552,000
- `balance_i` = token balance during interval `i`
- `duration_i` = seconds in interval `i`
- Intervals span from one balance-change event to the next (or to `twbWindowEnd`)
- If the address had no activity before `twbWindowStart`, initial balance = 0

**Sum across sources**: If one resolved address has multiple source entries (e.g., direct + MultiDelegate to the same voter), sum their TWBs.

**Output**: `tokenHolderTWB` — map of resolvedAddress → TWB (bigint, in WeiSeconds / totalWindowSeconds → effectively Wei)

---

### Step 11: Allocate Token-Holder Rewards

**Input**:
- `tokenHolderTWB` from Step 10
- `R`, `tokenHolderCap` from Step 5

**Process**:
1. `tokenHolderSubPool` = 90% of `R`
2. For each token holder `i`:
   ```
   rawReward(i) = TWB(i) / Σ_k TWB(k) × tokenHolderSubPool
   ```
3. Iterative cap redistribution at `tokenHolderCap` (same algorithm as Step 7):
   - a. Find all token holders where `rawReward > tokenHolderCap`
   - b. Set their reward to `tokenHolderCap`
   - c. Redistribute excess pro-rata to uncapped token holders
   - d. Repeat until no one exceeds cap

**Output**: `tokenHolderRewards` — map of resolvedAddress → reward (bigint, in Wei)

**Invariant**: Sum of all token-holder rewards = `tokenHolderSubPool` (minus integer rounding dust).

---

### Step 12: Combine Rewards

**Input**:
- `voterRewards` from Step 7
- `tokenHolderRewards` from Step 11

**Process**:
For each unique address across both maps:
```
combined(addr) = voterReward(addr) + tokenHolderReward(addr)
```
Either component may be 0. An address can earn from both pools (e.g., a self-delegating active voter).

**Output**: `combinedRewards` — map of address → `{ voterReward, tokenHolderReward, total }`

---

### Step 13: Apply Minimum Threshold

**Input**: `combinedRewards` from Step 12

**Process**:
- `directPayouts` = entries where `total ≥ 1 ENS` (1e18 Wei)
- `lotteryEntries` = entries where `total < 1 ENS`

**Output**: `directPayouts`, `lotteryEntries`

---

### Step 14: Run Lottery

Deterministic lottery for sub-threshold entries. Same inputs always produce same outputs.

**Input**:
- `lotteryEntries` from Step 13
- `endBlock` from Step 1

**Process**:
1. Fetch RANDAO value from `endBlock` (the last block of the month)
2. Sort `lotteryEntries` descending by reward amount
3. Form buckets:
   - Add entries sequentially to the current bucket
   - The entry that causes the running sum to exceed 10 ENS stays in the current bucket
   - The next entry starts a new bucket
   - Last bucket may be smaller than 10 ENS
4. For each bucket:
   - Prize = sum of all entry amounts in the bucket
   - Each entry's win probability = `entry.amount / bucket.total`
   - Winner selection: `keccak256(RANDAO, bucketIndex)` → interpret as uint256 → modulo `bucket.total` → map to winner by cumulative sum of entry amounts
5. Solo buckets (single entry): that entry wins automatically

**Output**: `lotteryResults` — array of:
```
{
  bucketIndex,
  entries: [{ address, amount, probability }],
  winner,
  prize
}
```

---

### Step 15: Write Output

Commit a JSON file to the repo.

**Path**: `distributions/{roundMonth}.json` (e.g., `distributions/2026-05.json`)

See [Section 4: Output Format](#4-output-format) for the full schema.

---

## 3. API Surface

### 3.1 Live Endpoints (real-time from indexed data)

#### `GET /voters/active`

Returns the current active-voter set (evaluated at query time, not month-end).

**Response per voter**:
- `address` — voter address
- `votingPower` — current VP (Wei)
- `votesInLast10` — how many of the last 10 finalized proposals they voted on
- `isActive` — boolean (votesInLast10 ≥ 7)
- `tokenHolderCount` — number of addresses currently delegating to them

#### `GET /eligibility/:address`

Checks if an address is currently delegating to an active voter.

**Response**:
- `eligible` — boolean
- `delegateTo` — address of their current voter (or null)
- `voterIsActive` — boolean
- `source` — "direct" | "multidelegate" | "hedgey" | null

#### `GET /rewards/estimate/:address`

Estimated reward for the current round, assuming the round ended now.

**Response**:
- `voterReward` — estimated voter reward (Wei), 0 if not an active voter
- `tokenHolderReward` — estimated token-holder reward (Wei), 0 if not an eligible token holder
- `combinedReward` — sum
- `aboveThreshold` — boolean (combined ≥ 1 ENS)
- `currentTier` — which tier the estimate uses

#### `GET /apy/estimate/:address`

Projected annualized return.

**Response**:
- `currentTierApy` — APY % based on current VP growth trajectory
- `tiers` — full tier table, each with: growth range, pool size, voter cap, token-holder cap, estimated APY for this address

APY calculation:
```
monthlyReward = estimated reward for this address at a given tier
balance = address's current ENS balance (or VP for voters)
APY = (monthlyReward / balance) × 12 × 100
```

#### `GET /rounds/current`

**Response**:
- `month` — current round month
- `daysRemaining` — days until month-end
- `vpGrowthSoFar` — current VP growth % (start-of-month to now)
- `currentTier` — tier based on current growth
- `activeVoterCount` — number of currently active voters

#### `GET /tiers`

**Response**:
- `currentVpGrowth` — current VP growth %
- `currentTier` — which tier we're in
- `tiers` — full table with: growth range, pool size (R), voter cap, token-holder cap, VP needed to reach this tier

### 3.2 Historical Endpoints (from committed JSON files)

#### `GET /distributions`

List of completed distribution months.

**Response**: array of `{ month, tier, poolSize, activeVoterCount, vpGrowth }`

#### `GET /distributions/:month`

Full distribution result for a past round. Returns the contents of `distributions/{month}.json`.

#### `GET /distributions/:month/csv`

CSV export of the distribution. Columns: `address, voter_reward, token_holder_reward, combined_reward, role, payout_type` (direct or lottery).

---

## 4. Output Format

Each round produces `distributions/{roundMonth}.json`:

```json
{
  "metadata": {
    "month": "2026-05",
    "monthStart": 1746057600,
    "monthEnd": 1748735999,
    "startBlock": 22000000,
    "endBlock": 22200000,
    "randaoValue": "0x...",
    "vpStart": "123456789000000000000000",
    "vpEnd": "234567890000000000000000",
    "vpGrowthPct": "89.85",
    "tier": 5,
    "poolSize": "25000000000000000000000",
    "voterCap": "250000000000000000000",
    "tokenHolderCap": "1250000000000000000000",
    "activeVoterCount": 58,
    "finalizedProposalIds": ["1", "2", "..."]
  },
  "rewards": [
    {
      "address": "0x...",
      "voterReward": "50000000000000000000",
      "tokenHolderReward": "120000000000000000000",
      "combinedReward": "170000000000000000000",
      "role": "both",
      "payoutType": "direct"
    }
  ],
  "lottery": {
    "buckets": [
      {
        "bucketIndex": 0,
        "entries": [
          {
            "address": "0x...",
            "amount": "800000000000000000",
            "probability": "0.08"
          }
        ],
        "prize": "9800000000000000000",
        "winner": "0x..."
      }
    ]
  },
  "deduplication": {
    "multiDelegate": [
      { "erc1155Holder": "0x...", "voter": "0x...", "amount": "1000000000000000000" }
    ],
    "hedgey": [
      { "vestingContract": "0x...", "nftOwner": "0x...", "planId": "123" }
    ],
    "walletAliases": [
      { "secondary": "0x...", "primary": "0x..." }
    ]
  }
}
```

All token amounts in Wei (string-encoded bigint). Percentages as decimal strings.

---

## 5. Configuration

### Round months

```
ROUND_MONTHS=2026-05,2026-06,2026-07
```

Hardcoded in repo config. The system only computes distributions for these months.

### Wallet aliases

File: `config/wallet-aliases.json`

```json
{
  "0xSecondaryAddress": "0xPrimaryAddress",
  "0xAnotherSecondary": "0xPrimaryAddress"
}
```

Maintained via PRs. Applied transitively (if A→B and B→C, A resolves to C).

### Distribution trigger

Cron job calls a script after month-end. The script:
1. Runs the pipeline for the completed round month
2. Writes the output JSON to `distributions/{month}.json`
3. Commits and pushes to the repo

---

## 6. Constants

| Name | Value | Description |
|---|---|---|
| `ACTIVE_VOTE_THRESHOLD` | 7 | Minimum votes in last 10 finalized proposals to qualify as an active voter |
| `PROPOSAL_WINDOW_SIZE` | 10 | Number of recent finalized proposals considered |
| `VOTER_POOL_BPS` | 1,000 (10%) | Share of monthly pool allocated to active voters |
| `TOKEN_HOLDER_POOL_BPS` | 9,000 (90%) | Share of monthly pool allocated to eligible token holders |
| `VOTER_CAP_BPS` | 100 (1%) | Per-voter cap as percentage of R |
| `TOKEN_HOLDER_CAP_BPS` | 500 (5%) | Per-token-holder cap as percentage of R |
| `TWB_WINDOW_DAYS` | 180 | Lookback window for time-weighted balance |
| `MIN_REWARD_THRESHOLD` | 1 ENS (1e18 Wei) | Minimum combined reward for direct payout |
| `LOTTERY_BUCKET_TARGET` | 10 ENS (1e19 Wei) | Target size for lottery buckets |

---

## 7. Glossary

The same person can fill more than one role — a voter who also holds ENS will receive both a voter share (Step 7) and a token-holder share (Step 11). The terms refer to roles in the distribution, not identities.

| Term | Definition |
|---|---|
| **Voter** | An address that holds (delegated) voting power on the ENS governor — the recipient of token-holder delegations. At the on-chain protocol level this is called a "delegate." |
| **Active Voter** | Voter that voted on ≥7 of the last 10 finalized on-chain proposals |
| **Token Holder** | An address that owns ENS tokens and has delegated them. At the on-chain protocol level this is called a "delegator." |
| **Eligible Token Holder** | Token holder whose most-recent delegation at `monthEnd` points to an active voter and whose 180-day TWB > 0 |
| **Finalized Proposal** | On-chain proposal with status: executed, defeated, canceled, succeeded, queued, or expired |
| **VP (Voting Power)** | The total delegated ENS tokens backing a voter, as reported by `DelegateVotesChanged` |
| **AVP (TWAP VP)** | Time-Weighted Average Voting Power — second-by-second average of a voter's VP during a round month |
| **TWB** | Time-Weighted Balance — second-by-second average of a token holder's ENS holdings over a 180-day lookback window |
| **R** | Monthly reward pool size in ENS, determined by the VP growth tier |
| **Reward** | The amount allocated to a recipient by the pipeline (before lottery resolution) |
| **Payout** | The on-chain transfer of a reward, or a row in the exported distribution CSV |
| **Round** | A monthly distribution period. One round = one calendar month = one computed `Distribution` |
| **Cap Redistribution** | Iterative process: excess from capped recipients is redistributed pro-rata to uncapped recipients until no one exceeds the cap |
| **ERC20MultiDelegate** | Contract allowing delegation splitting. Users receive ERC1155 tokens as proof of delegation. Token ID = uint256(voter address) |
| **Hedgey Vesting** | Vesting contract that holds ENS and delegates. Beneficiary = current NFT owner |
| **Wallet Alias** | Manual mapping of secondary EOAs to a primary address, applied before cap calculation to prevent cap evasion |
| **Lottery** | Sub-1-ENS rewards are grouped into ~10 ENS buckets. One winner per bucket, selected deterministically via RANDAO. Probability = entry amount / bucket total |
| **RANDAO** | Randomness beacon from the block's execution layer. Used as seed for deterministic lottery. Sourced from the last block of the round month |
