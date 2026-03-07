# @ens-dis/indexer

Ponder-based on-chain event indexer for the ENS Delegation Incentives System. Indexes two Ethereum mainnet contracts that require special handling for reward distribution.

## Indexed Contracts

### ERC20MultiDelegate

**Address**: `0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446`
**Start Block**: 18,564,837

Allows users to deposit ENS tokens and delegate to multiple delegates simultaneously. Creates proxy addresses per delegate and mints ERC1155 receipt tokens.

**Indexed events**:
- `ProxyDeployed` — Records proxy-to-delegate mappings
- `TransferSingle` / `TransferBatch` — Tracks ERC1155 position changes (token ID = delegate address as uint256)
- `DelegationProcessed` — Available for supplementary tracking

**Why it matters**: Without this indexer, Anticapture sees each proxy as a separate account. The indexer traces each proxy back to the depositor so rewards route correctly and TWBs are consolidated.

### Hedgey TokenVestingPlans

**Address**: `0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C`
**Start Block**: 18,506,969

ENS tokens sit inside the vesting contract. The beneficiary holds an ERC721 NFT representing their vesting position. Locked tokens can still vote via delegation.

**Indexed events**:
- `PlanCreated` — Inserts vesting plan (filtered to ENS token only)
- `PlanRedeemed` — Updates redeemed amounts
- `Transfer` (ERC721) — Updates plan recipient when NFT is transferred

**Why it matters**: Rewards must go to the NFT holder (the beneficiary), not the vesting contract. If the NFT is transferred, the new holder should receive future rewards.

## Schema

| Table | Description |
|---|---|
| `multi_delegate_proxy` | Proxy address → delegate mapping |
| `multi_delegate_position` | Current ERC1155 positions (owner, delegate, amount) |
| `multi_delegate_transfer` | Historical transfer log |
| `vesting_plan` | Active vesting plans with schedule parameters |
| `vesting_redemption` | Redemption event history |
| `protocol_mapping` | **Output table** — maps child addresses to operators, consumed by backend |

## Development

```bash
# Set up environment
cp .env.example .env
# Edit .env with your Ethereum RPC URL

# Start development (with hot reload)
pnpm dev

# Start production
pnpm start

# Generate types
pnpm codegen
```

## Environment Variables

| Variable | Description |
|---|---|
| `PONDER_RPC_URL_1` | Ethereum mainnet RPC URL (Alchemy, Infura, etc.) |
