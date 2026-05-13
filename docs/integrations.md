# Protocol Integrations

This document describes every on-chain contract the system indexes, what events are handled, what data is stored, and how that data is consumed by the incentives pipeline.

The indexer runs on Ponder (v0.16) against Ethereum mainnet. Configuration is in `apps/backend/ponder.config.ts`.

> **Note on protocol vs. app terminology.** Event signatures and contract-level fields use the on-chain protocol terms (`delegator`, `delegate`). Adapters map them to our app vocabulary — **voter** (the recipient of delegated voting power) and **token holder** (the holder of delegated tokens) — at the boundary with the domain pipeline.

---

## ENS Token

**Contract**: `0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72`
**Start block**: 21,000,000 (~12 months before program launch, providing margin beyond the 180-day TWB window)
**Handler**: `apps/backend/src/handlers/ensToken.ts`

### Events

#### `Transfer(from, to, value)`

Tracks the ENS token balance of every address. On each transfer:

- **Sender** (`from`, unless zero address): balance is decremented by `value` in `ens_balance`; a `ens_balance_event` row is inserted recording the new cumulative balance, the signed delta, and timestamp.
- **Receiver** (`to`, unless zero address): same but incremented.

Mints (`from = 0x0`) only update the receiver. Burns (`to = 0x0`) only update the sender.

**Why this matters for the pipeline**: `ens_balance_event` is the source for the 180-day time-weighted balance (TWB) of token holders (Step 9). The TWB uses the history of balance changes, not the current balance, so point-in-time balance snapshots are insufficient.

#### `DelegateChanged(delegator, fromDelegate, toDelegate)`

Records that the token holder `delegator` re-delegated from `fromDelegate` to `toDelegate`. Two writes:

1. `ens_delegation` (upsert by token-holder address): the current canonical voter for this token holder.
2. `ens_delegation_event` (append-only): full history of delegation changes, including the delegated value at the time of the event (read from `ens_balance` at event time).

**Why this matters**: `ens_delegation_event` is used by `DelegationAdapter.getActiveDelegations` to determine who was delegating to an active voter at `monthEnd`. The adapter loads all events with `timestamp ≤ monthEnd`, takes the **latest per token holder** (sorted by timestamp DESC), and filters to those whose latest delegation pointed to an active voter — correctly excluding token holders who switched away mid-month.

#### `DelegateVotesChanged(delegate, previousBalance, newBalance)`

Records a change in a voter's total voting power (triggered by transfers or delegation changes). Each event inserts a row in `ens_voting_power_snapshot` with:
- `accountId` (the voter)
- `votingPower` (new cumulative VP)
- `delta` (signed change)
- `timestamp`

**Why this matters**: `ens_voting_power_snapshot` is the source for:
- Individual active-voter AVP over the calendar month via TWAP (pipeline Step 5)
- Point-in-time total VP at month boundaries for MoM tier selection (pipeline Step 4) via `VotingPowerAdapter.getAggregateVotingPowerAt`
- Live APY estimates and tier progression via the same point-in-time query

---

## ENS Governor

**Contract**: `0x323a76393544d5ecca80cd6ef2a560c6a395b7e3`
**Start block**: 13,533,800
**Handler**: `apps/backend/src/handlers/ensGovernor.ts`

### Events

#### `ProposalCreated(proposalId, proposer, voteStart, voteEnd, description, ...)`

Inserts a row in `governance_proposal` with `status = "active"`, along with `startBlock`, `endBlock`, and `timestamp`.

#### `VoteCast(voter, proposalId, support, weight, reason)` and `VoteCastWithParams(...)`

Both are handled identically (the `WithParams` variant is an extended version with extra calldata). Inserts or updates a row in `governance_vote` keyed by `(proposalId, voter)`:
- `support`: 0 = Against, 1 = For, 2 = Abstain
- `weight`: voting power at the time of the vote

**Why this matters**: `governance_vote` is consumed by `VoteAdapter.getVotesForProposals` in pipeline Step 2, which then feeds `identifyActiveVoters` (Step 3). All three support values count — a voter who votes Against or Abstains still satisfies the activity threshold.

#### `ProposalExecuted(proposalId)`, `ProposalDefeated(proposalId)`, `ProposalCanceled(proposalId)`

Update the `status` field of the corresponding `governance_proposal` row to `"executed"`, `"defeated"`, or `"canceled"`.

**Why this matters**: `ProposalAdapter.getRecentProposals` filters to `status != "active"` — only finalized proposals count toward the activity threshold. This prevents the count from changing mid-vote as voters rush to vote before a proposal closes.

---

## ERC20MultiDelegate

**Contract**: `0x3CA5CCC96648d016D41c5aF40eED82202BD019cc`
**Start block**: 22,140,079
**Handler**: `apps/backend/src/handlers/multiDelegate.ts`

ERC20MultiDelegate allows a single holder to split their ENS delegation across multiple voters. It works by deploying a lightweight proxy contract per (holder, voter) pair. The proxy holds the ENS tokens and delegates them, while the holder retains economic ownership via ERC1155 tokens where each token ID encodes the voter address.

### Events

#### `ProxyDeployed(delegate, proxyAddress)`

Records that a proxy was deployed for the voter `delegate` at `proxyAddress`. Stored in `multi_delegate_proxy`.

This is used to resolve proxy addresses back to their voter during position tracking.

#### `TransferSingle(operator, from, to, id, value)` and `TransferBatch(operator, from, to, ids, values)`

The ERC1155 token ID encodes the voter address (the lower 160 bits are the voter's address). These events represent transfers of delegation positions.

**`from = 0x0`** (mint): a new delegation position is being created for `to`. An `onConflictDoUpdate` upsert accumulates `amount` for the `(toAddress, voterAddress)` position in `multi_delegate_position`.

**`to = 0x0`** (burn): the position is being closed or reduced. The `amount` is decremented; if it reaches `0`, both the `multi_delegate_position` row and the corresponding `protocol_mapping` row are deleted (the stale mapping would otherwise persist and incorrectly deduplicate the former holder).

**Regular transfer** (`from` ≠ `0x0`, `to` ≠ `0x0`): decrements sender's position (deletes if zero, including its mapping) and increments receiver's position.

For each active `to` position, a `protocol_mapping` row is upserted:
```
id:              multi_delegate-{toAddress}-{voterAddress}
childAddress:    proxyAddress (if a proxy exists for this voter) or voterAddress
operatorAddress: toAddress
protocol:        "multi_delegate"
```

**Why this matters for the pipeline**: When the pipeline sees that a proxy address holds ENS tokens, it needs to know the proxy's economic owner. `protocol_mapping` (populated here) provides that mapping. In Step 10, `consolidateTokenHolders` resolves proxy addresses to operators, merging their TWBs before cap enforcement. Without this, a holder using ERC20MultiDelegate would appear as multiple separate participants instead of one entity.

#### `DelegationProcessed(owner, from, to, amount)`

Supplementary event emitted by the contract when delegation routing is processed. **Not consumed** by the indexer — all position accounting is derived solely from `TransferSingle` and `TransferBatch`, which are the authoritative ERC1155 transfer records.

---

## Hedgey TokenVestingPlans

**Contract**: `0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C`
**Start block**: 18,506,969
**Handler**: `apps/backend/src/handlers/hedgeyVesting.ts`

Hedgey is an NFT-based vesting platform. ENS grants and contributor compensation are sometimes distributed as Hedgey vesting plans — the tokens are locked in the contract and released over time according to a schedule. The plan NFT can be transferred, changing who has the right to redeem.

**Only ENS token plans are indexed.** Events for other tokens are ignored at handler entry.

### Events

#### `PlanCreated(id, recipient, token, amount, start, cliff, end, rate, period, ...)`

Creates a `vesting_plan` row with the full schedule parameters. Also inserts a `protocol_mapping`:
```
id:              hedgey_vesting-{planId}
childAddress:    HEDGEY_VESTING_ADDRESS  (the contract holds the ENS)
operatorAddress: recipient               (the plan beneficiary)
protocol:        "hedgey_vesting"
```

**Why this matters**: The ENS tokens in a vesting plan are held by the Hedgey contract, not the recipient. When calculating TWB, the system sees tokens at `HEDGEY_VESTING_ADDRESS`. The `protocol_mapping` tells the pipeline that those tokens economically belong to the `recipient`. In Step 10, the recipient's TWB is credited with the vesting plan balance rather than assigning it to the contract address.

#### `PlanRedeemed(id, amountRedeemed, planRemainder, resetDate)`

Updates `amountRedeemed` on the vesting plan and appends a `vesting_redemption` event. Not directly consumed by the pipeline but provides audit trail for the vesting schedule.

#### `Transfer(from, to, tokenId)` (NFT transfer)

When the vesting plan NFT changes hands:
- **Burn** (`to = 0x0`): deletes the `protocol_mapping` — plan is fully redeemed and the mapping is no longer needed.
- **Regular transfer**: updates both `vesting_plan.recipient` and `protocol_mapping.operatorAddress` to the new NFT holder `to`. This ensures the correct beneficiary is credited when the plan is next resolved during consolidation.

Mint events (`from = 0x0`) are ignored because `PlanCreated` already set the initial recipient.

---

## Data Flow Summary

```
On-chain event
      │
      ▼
Ponder handler (apps/backend/src/handlers/)
      │  writes to
      ▼
PostgreSQL tables (via ponder:schema)
      │
      ├─ ens_balance_event        ──► BalanceAdapter       ──► Token-holder TWB (Step 9)
      ├─ ens_delegation_event     ──► DelegationAdapter    ──► Active delegations (Step 7)
      ├─ ens_voting_power_snapshot──► VotingPowerAdapter   ──► point-in-time total VP (Step 4), TWAP AVP (Step 5)
      ├─ governance_proposal      ──► ProposalAdapter      ──► Recent proposals (Step 2)
      ├─ governance_vote          ──► VoteAdapter          ──► Votes (Step 2)
      └─ protocol_mapping         ──► ProtocolMappingAdapter──► Consolidation (Step 10)
```

The `wallet_alias` table is not populated by any handler — it is managed manually by the operator (see `OPERATOR.md`). It provides the same consolidation function as `protocol_mapping` but for EOA aliases known off-chain.

---

## Address Normalization

All addresses are stored and queried in **lowercase** throughout the system. The `normalizeAddress` helper in `apps/backend/src/common/address.ts` applies `toLowerCase()` before every write. Adapters also normalize incoming query parameters. This prevents case-sensitivity mismatches when cross-referencing addresses across tables.

The `tokenIdToAddress` helper decodes ERC1155 token IDs from ERC20MultiDelegate into their corresponding voter address (the token ID is the voter address cast to uint256).
