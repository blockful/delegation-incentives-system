# @ens-dis/indexer

Ponder-based on-chain event indexer for the ENS Delegation Incentives System. Indexes three Ethereum mainnet contracts to provide balance history, delegation mappings, voting power snapshots, and protocol deduplication data for the backend reward computation pipeline.

## Indexed Contracts

### ENS Token

**Address**: `0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72`
**Start Block**: 21,000,000 (~12 months before program launch)

The ENS governance token (ERC20Votes). Indexing provides per-second balance history for TWB computation, delegation mappings, and voting power snapshots.

**Indexed events**:
- `Transfer` — Tracks all ENS token transfers; maintains running balances per address and records balance change events for 180-day TWB computation
- `DelegateChanged` — Records delegation changes (delegator → delegate) used by the backend to determine eligible delegators
- `DelegateVotesChanged` — Records voting power snapshots used for delegate reward calculations

### ERC20MultiDelegate

**Address**: `0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446`
**Start Block**: 18,564,837

Allows users to deposit ENS tokens and delegate to multiple delegates simultaneously. Creates proxy addresses per delegate and mints ERC1155 receipt tokens.

**Indexed events**:
- `ProxyDeployed` — Records proxy-to-delegate mappings
- `TransferSingle` / `TransferBatch` — Tracks ERC1155 position changes (token ID = delegate address as uint256)
- `DelegationProcessed` — Available for supplementary tracking

**Why it matters**: Without this indexer, each proxy appears as a separate account. The indexer traces each proxy back to the depositor so rewards route correctly and TWBs are consolidated.

### Hedgey TokenVestingPlans

**Address**: `0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C`
**Start Block**: 18,506,969

ENS tokens sit inside the vesting contract. The beneficiary holds an ERC721 NFT representing their vesting position. Locked tokens can still vote via delegation.

**Indexed events**:
- `PlanCreated` — Inserts vesting plan (filtered to ENS token only)
- `PlanRedeemed` — Updates redeemed amounts
- `Transfer` (ERC721) — Updates plan recipient when NFT is transferred; cleans up mapping on burn

**Why it matters**: Rewards must go to the NFT holder (the beneficiary), not the vesting contract. If the NFT is transferred, the new holder should receive future rewards.

## Schema

| Table | Description |
|---|---|
| `ens_balance` | Current ENS token balance per address (running state) |
| `ens_balance_event` | Historical balance changes from Transfer events |
| `ens_delegation` | Current delegation mapping (delegator → delegate) |
| `ens_delegation_event` | Historical delegation changes |
| `ens_voting_power_snapshot` | Voting power changes from DelegateVotesChanged |
| `multi_delegate_proxy` | Proxy address → delegate mapping |
| `multi_delegate_position` | Current ERC1155 positions (owner, delegate, amount) |
| `multi_delegate_transfer` | Historical transfer log |
| `vesting_plan` | Active vesting plans with schedule parameters |
| `vesting_redemption` | Redemption event history |
| `protocol_mapping` | **Output table** — maps child addresses to operators, consumed by backend |

## How the Backend Consumes Indexed Data

| Backend Repository | Indexed Table(s) |
|---|---|
| `BalanceRepository` | `ens_balance_event`, `ens_balance` |
| `DelegationRepository` | `ens_delegation`, `ens_balance` |
| `VotingPowerRepository` | `ens_voting_power_snapshot` |
| `ProtocolMappingRepository` | `protocol_mapping` |

## Development

```bash
# Set up environment (from project root)
cp .env.example .env
# Edit .env with your Ethereum RPC URL (PONDER_RPC_URL_1)

# Start development (with hot reload)
pnpm dev

# Start production
pnpm start

# Generate types
pnpm codegen
```

## Environment Variables

All env vars are loaded from the project root `.env`. See root `.env.example`.

| Variable | Description |
|---|---|
| `PONDER_RPC_URL_1` | Ethereum mainnet RPC URL (Alchemy, Infura, etc.) |
