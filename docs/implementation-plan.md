# ENS Delegation Incentives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean rewrite of the delegation incentives backend implementing the full 15-step distribution pipeline, indexer, and API per the PRD at `docs/prd.md`.

**Architecture:** Ponder indexer (4 contracts) → PostgreSQL → pure domain logic (zero deps) → Hono REST API. Monorepo: `packages/domain` (types, algorithm), `apps/backend` (indexer, adapters, API).

**Tech Stack:** Ponder 0.16, Hono, Drizzle ORM, Zod OpenAPI, Vitest, viem, TypeScript (strict), BigInt throughout.

---

## Phase 1: Foundation + Schema

Clean slate. Define types, constants, Ponder schema, Ponder config.

### Task 1.1: Clean existing source code

**Files:**
- Delete: `packages/domain/src/**/*` (all source files)
- Delete: `packages/domain/test/**/*` (all test files)
- Delete: `apps/backend/src/**/*` (all source files)
- Keep: `package.json`, `tsconfig.json`, `ponder.config.ts` (will overwrite), `ponder.schema.ts` (will overwrite), `vitest.config.ts`

- [ ] Delete all source and test files in packages/domain and apps/backend
- [ ] Verify clean state: `pnpm typecheck` should fail (no source files)

### Task 1.2: Domain types

**Files:**
- Create: `packages/domain/src/types.ts`
- Create: `packages/domain/src/index.ts`

- [ ] Define branded BigInt types:

```typescript
// Branded types for type safety — prevents mixing Wei with Seconds etc.
export type Wei = bigint & { readonly __brand: "Wei" };
export type Seconds = bigint & { readonly __brand: "Seconds" };
export type WeiSeconds = bigint & { readonly __brand: "WeiSeconds" };
export type BasisPoints = bigint & { readonly __brand: "BasisPoints" };
export type BlockNumber = bigint & { readonly __brand: "BlockNumber" };

// Constructor helpers
export const wei = (n: bigint): Wei => n as Wei;
export const seconds = (n: bigint): Seconds => n as Seconds;
export const bps = (n: bigint): BasisPoints => n as BasisPoints;
```

- [ ] Define domain data types:

```typescript
export type Address = `0x${string}`;

export interface Proposal {
  id: string;
  status: ProposalStatus;
  timestamp: Seconds;        // creation timestamp
  endTimestamp: Seconds;      // voting end timestamp
  finalizedTimestamp: Seconds | null; // when status changed to final
}

export type ProposalStatus =
  | "pending" | "active"
  | "executed" | "defeated" | "canceled"
  | "succeeded" | "queued" | "expired";

export const FINALIZED_STATUSES: Set<ProposalStatus> = new Set([
  "executed", "defeated", "canceled", "succeeded", "queued", "expired",
]);

export interface Vote {
  voter: Address;
  proposalId: string;
  support: number;          // 0=against, 1=for, 2=abstain
  weight: Wei;
  timestamp: Seconds;
}

export interface VotingPowerEvent {
  delegate: Address;
  newBalance: Wei;
  timestamp: Seconds;
  blockNumber: BlockNumber;
}

export interface BalanceEvent {
  account: Address;
  balance: Wei;
  timestamp: Seconds;
}

export interface Delegation {
  delegator: Address;
  delegate: Address;
  timestamp: Seconds;
}

export interface MultiDelegatePosition {
  holder: Address;           // ERC1155 holder (true owner)
  delegate: Address;         // who they're delegating to
  amount: Wei;               // ERC1155 balance = delegated amount
}

export interface Erc1155BalanceEvent {
  holder: Address;
  delegate: Address;         // derived from tokenId
  balance: Wei;              // running ERC1155 balance
  timestamp: Seconds;
}

export interface VestingPlan {
  planId: string;
  contractAddress: Address;  // the vesting contract holding ENS
  recipient: Address;        // initial recipient
  token: Address;
}

export interface VestingNftOwnership {
  planId: string;
  owner: Address;
  timestamp: Seconds;
}

export interface WalletAlias {
  secondary: Address;
  primary: Address;
}

export interface ProtocolMapping {
  originalAddress: Address;
  resolvedAddress: Address;
  delegateAddress: Address;
  source: TokenHolderSource;
}

export type TokenHolderSource = "direct" | "multidelegate" | "hedgey";

export interface EligibleTokenHolder {
  resolvedAddress: Address;
  originalAddress: Address;
  delegateAddress: Address;
  source: TokenHolderSource;
}

export interface ConsolidatedTokenHolder {
  resolvedAddress: Address;
  sources: EligibleTokenHolder[];
}

export interface RewardAllocation {
  address: Address;
  amount: Wei;
}

export interface CombinedReward {
  address: Address;
  voterReward: Wei;
  tokenHolderReward: Wei;
  total: Wei;
}

export interface LotteryBucket {
  bucketIndex: number;
  entries: LotteryEntry[];
  prize: Wei;
  winner: Address;
}

export interface LotteryEntry {
  address: Address;
  amount: Wei;
}

export interface PoolTier {
  minGrowthBps: BasisPoints;
  maxGrowthBps: BasisPoints; // exclusive upper bound, except last tier (Infinity)
  poolSize: Wei;
}

export interface RoundBoundaries {
  monthStart: Seconds;
  monthEnd: Seconds;
  startBlock: BlockNumber;
  endBlock: BlockNumber;
}

export interface DistributionResult {
  metadata: DistributionMetadata;
  rewards: CombinedReward[];
  lottery: { buckets: LotteryBucket[] };
  deduplication: DeduplicationLog;
}

export interface DistributionMetadata {
  month: string;
  monthStart: Seconds;
  monthEnd: Seconds;
  startBlock: BlockNumber;
  endBlock: BlockNumber;
  randaoValue: string;
  vpStart: Wei;
  vpEnd: Wei;
  vpGrowthBps: BasisPoints;
  tier: number;
  poolSize: Wei;
  voterCap: Wei;
  tokenHolderCap: Wei;
  activeVoterCount: number;
  finalizedProposalIds: string[];
}

export interface DeduplicationLog {
  multiDelegate: { erc1155Holder: Address; delegate: Address; amount: Wei }[];
  hedgey: { vestingContract: Address; nftOwner: Address; planId: string }[];
  walletAliases: { secondary: Address; primary: Address }[];
}
```

- [ ] Create barrel export `index.ts` re-exporting all types
- [ ] Run: `pnpm --filter @ens-dis/domain typecheck` — should pass

### Task 1.3: Domain constants and config

**Files:**
- Create: `packages/domain/src/config.ts`

- [ ] Define constants and tier table:

```typescript
import { wei, bps, type Wei, type BasisPoints, type PoolTier } from "./types.js";

export const ACTIVE_VOTE_THRESHOLD = 7;
export const PROPOSAL_WINDOW_SIZE = 10;

export const VOTER_POOL_BPS = bps(1000n);          // 10%
export const TOKEN_HOLDER_POOL_BPS = bps(9000n);   // 90%

export const VOTER_CAP_BPS = bps(100n);            // 1% of R
export const TOKEN_HOLDER_CAP_BPS = bps(500n);     // 5% of R

export const TWB_WINDOW_SECONDS = 180n * 24n * 3600n; // 15,552,000 seconds

export const MIN_REWARD_THRESHOLD = wei(1_000_000_000_000_000_000n); // 1 ENS
export const LOTTERY_BUCKET_TARGET = wei(10_000_000_000_000_000_000n); // 10 ENS

export const BPS_BASE = 10_000n;

// Tier table: growth ranges in bps → pool size in Wei (ENS has 18 decimals)
const ENS = 1_000_000_000_000_000_000n; // 1e18

export const POOL_TIERS: PoolTier[] = [
  { minGrowthBps: bps(0n),      maxGrowthBps: bps(1000n),  poolSize: wei(5_000n * ENS) },
  { minGrowthBps: bps(1000n),   maxGrowthBps: bps(2000n),  poolSize: wei(8_000n * ENS) },
  { minGrowthBps: bps(2000n),   maxGrowthBps: bps(3000n),  poolSize: wei(10_000n * ENS) },
  { minGrowthBps: bps(3000n),   maxGrowthBps: bps(5000n),  poolSize: wei(15_000n * ENS) },
  { minGrowthBps: bps(5000n),   maxGrowthBps: bps(7500n),  poolSize: wei(20_000n * ENS) },
  { minGrowthBps: bps(7500n),   maxGrowthBps: bps(10000n), poolSize: wei(25_000n * ENS) },
  { minGrowthBps: bps(10000n),  maxGrowthBps: bps(100_000n), poolSize: wei(30_000n * ENS) },
];
```

- [ ] Run typecheck

### Task 1.4: BigInt math utilities

**Files:**
- Create: `packages/domain/src/util/bigint-math.ts`
- Create: `packages/domain/test/unit/util/bigint-math.test.ts`

- [ ] Write tests for: `sum`, `mulDiv`, `applyBps`, `percentageGrowthBps`
- [ ] Implement utilities
- [ ] Run: `pnpm --filter @ens-dis/domain test`

### Task 1.5: Time utilities

**Files:**
- Create: `packages/domain/src/util/time.ts`
- Create: `packages/domain/test/unit/util/time.test.ts`

- [ ] Write tests for: `parseMonth` ("2026-05" → timestamps), `monthStartTimestamp`, `monthEndTimestamp`
- [ ] Implement: month boundaries as Unix timestamps (UTC). `monthStart` = 00:00:00 first day. `monthEnd` = 23:59:59 last day.
- [ ] Run tests

### Task 1.6: Domain interfaces (data source contracts)

**Files:**
- Create: `packages/domain/src/interfaces.ts`

- [ ] Define repository interfaces the pipeline depends on:

```typescript
export interface ProposalRepository {
  getFinalizedProposals(beforeTimestamp: Seconds, limit: number): Promise<Proposal[]>;
}

export interface VoteRepository {
  getVotesForProposals(proposalIds: string[]): Promise<Vote[]>;
}

export interface VotingPowerRepository {
  getVpEventsInRange(delegate: Address, from: Seconds, to: Seconds): Promise<VotingPowerEvent[]>;
  getVpAtTimestamp(delegate: Address, timestamp: Seconds): Promise<Wei>;
  getAggregateVpAtTimestamp(delegates: Address[], timestamp: Seconds): Promise<Wei>;
}

export interface BalanceRepository {
  getBalanceEventsInRange(account: Address, from: Seconds, to: Seconds): Promise<BalanceEvent[]>;
  getBalanceAtTimestamp(account: Address, timestamp: Seconds): Promise<Wei>;
}

export interface DelegationRepository {
  getDelegationsToAtTimestamp(delegates: Address[], timestamp: Seconds): Promise<Delegation[]>;
}

export interface MultiDelegateRepository {
  getPositionsAtTimestamp(delegates: Address[], timestamp: Seconds): Promise<MultiDelegatePosition[]>;
  getErc1155BalanceEventsInRange(holder: Address, delegate: Address, from: Seconds, to: Seconds): Promise<Erc1155BalanceEvent[]>;
  getErc1155BalanceAtTimestamp(holder: Address, delegate: Address, timestamp: Seconds): Promise<Wei>;
}

export interface VestingRepository {
  getVestingContractAddresses(): Promise<Set<Address>>;
  getNftOwnerAtTimestamp(planId: string, timestamp: Seconds): Promise<Address | null>;
  getPlansForContracts(contractAddresses: Address[]): Promise<VestingPlan[]>;
}

export interface BlockRepository {
  getBlockForTimestamp(timestamp: Seconds): Promise<BlockNumber>;
  getRandaoValue(blockNumber: BlockNumber): Promise<string>;
}

export interface WalletAliasRepository {
  getAliases(): Promise<WalletAlias[]>;
}

export interface IncentivesDataSource {
  proposals: ProposalRepository;
  votes: VoteRepository;
  votingPower: VotingPowerRepository;
  balances: BalanceRepository;
  delegations: DelegationRepository;
  multiDelegate: MultiDelegateRepository;
  vesting: VestingRepository;
  blocks: BlockRepository;
  walletAliases: WalletAliasRepository;
}
```

- [ ] Export from index.ts
- [ ] Run typecheck

### Task 1.7: Ponder schema

**Files:**
- Overwrite: `apps/backend/ponder.schema.ts`

- [ ] Define all tables matching the data needs of the domain interfaces. See existing schema for reference pattern (onchainTable).
- [ ] Run: `pnpm --filter @ens-dis/backend typecheck`

### Task 1.8: Ponder config

**Files:**
- Overwrite: `apps/backend/ponder.config.ts`

- [ ] Configure all 4 contracts with correct addresses, start blocks, and ABIs from existing config.
- [ ] Contracts:
  - ENS Token: `0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72` from block 21,000,000
  - ENS Governor: `0x323a76393544d5ecca80cd6ef2a560c6a395b7e3` from block 13,533,800
  - ERC20MultiDelegate: `0x3CA5CCC96648d016D41c5aF40eED82202BD019cc` from block 22,140,079
  - Hedgey Vesting: `0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C` from block 18,506,969
- [ ] Run typecheck

### Task 1.9: Commit Phase 1

- [ ] `git add -A && git commit -m "phase 1: foundation — types, config, schema, interfaces"`

---

## Phase 2: Event Handlers (Indexer)

Ponder event handlers that populate the schema tables from on-chain events.

### Task 2.1: ENS Token handler

**Files:**
- Create: `apps/backend/src/handlers/ens-token.ts`
- Create: `apps/backend/src/index.ts` (handler registration entry point)

- [ ] Implement handlers for: `Transfer`, `DelegateChanged`, `DelegateVotesChanged`
- [ ] Transfer: update `ens_balance` (upsert current balance), insert `ens_balance_event` (with delta)
- [ ] DelegateChanged: update `ens_delegation` (upsert tokenHolder→voter), insert `ens_delegation_event`
- [ ] DelegateVotesChanged: insert `ens_voting_power_snapshot` (delegate, newBalance, timestamp)
- [ ] Run typecheck

### Task 2.2: ENS Governor handler

**Files:**
- Create: `apps/backend/src/handlers/ens-governor.ts`

- [ ] Implement handlers for: `ProposalCreated`, `VoteCast`, `VoteCastWithParams`, `ProposalExecuted`, `ProposalDefeated`, `ProposalCanceled`
- [ ] ProposalCreated: insert `governance_proposal` with status "active"
- [ ] VoteCast/VoteCastWithParams: upsert `governance_vote` (voter, proposalId, support, weight, timestamp)
- [ ] ProposalExecuted/Defeated/Canceled: update proposal status + set `finalizedTimestamp`
- [ ] Run typecheck

### Task 2.3: ERC20MultiDelegate handler

**Files:**
- Create: `apps/backend/src/handlers/multi-delegate.ts`

- [ ] Implement handlers for: `ProxyDeployed`, `TransferSingle`, `TransferBatch`
- [ ] ProxyDeployed: insert `multi_delegate_proxy`
- [ ] TransferSingle: decode tokenId → delegate address; update `multi_delegate_position` (holder balance); insert `multi_delegate_transfer`
- [ ] TransferBatch: iterate ids/values, same logic as TransferSingle per entry
- [ ] Handle mint (from=0x0) and burn (to=0x0) correctly
- [ ] Run typecheck

### Task 2.4: Hedgey Vesting handler

**Files:**
- Create: `apps/backend/src/handlers/hedgey-vesting.ts`

- [ ] Implement handlers for: `PlanCreated`, `Transfer` (ERC721)
- [ ] PlanCreated: insert `vesting_plan` (planId, contractAddress, recipient, token, amount)
- [ ] Transfer (NFT): update `vesting_plan` current owner; insert `vesting_nft_transfer` for ownership history
- [ ] Run typecheck

### Task 2.5: Commit Phase 2

- [ ] `git add -A && git commit -m "phase 2: ponder event handlers for all 4 contracts"`

---

## Phase 3: Domain Core Calculations

Pure functions for Steps 1–6 of the pipeline.

### Task 3.1: Active voter identification (Steps 2-3)

**Files:**
- Create: `packages/domain/src/active-voters.ts`
- Create: `packages/domain/test/unit/active-voters.test.ts`

- [ ] Write tests: 10 proposals, delegates with varying vote counts, threshold = 7
- [ ] Test edge cases: exactly 7 votes, 6 votes, fewer than 10 proposals
- [ ] Implement `identifyActiveVoters(proposals, votes)` → Set<Address>
- [ ] Run tests

### Task 3.2: Pool tier selection (Steps 4-5)

**Files:**
- Create: `packages/domain/src/pool-sizing.ts`
- Create: `packages/domain/test/unit/pool-sizing.test.ts`

- [ ] Write tests: growth at each tier boundary, negative growth, zero vpStart
- [ ] Implement `computeVpGrowth(vpStart, vpEnd)` → BasisPoints
- [ ] Implement `selectPoolTier(growthBps)` → PoolTier
- [ ] Implement `computeCaps(poolSize)` → { voterCap, tokenHolderCap }
- [ ] Run tests

### Task 3.3: Time-weighted balance (Step 10 core math)

**Files:**
- Create: `packages/domain/src/time-weighted-balance.ts`
- Create: `packages/domain/test/unit/time-weighted-balance.test.ts`

- [ ] Write tests: constant balance, balance changes mid-window, no balance before window, events at window boundaries
- [ ] Implement `computeTWB(events, windowStart, windowEnd, initialBalance)` → Wei
- [ ] Handles: step-function integration over [windowStart, windowEnd]
- [ ] Run tests

### Task 3.4: Time-weighted average VP (Step 6)

**Files:**
- Create: `packages/domain/src/twap-voting-power.ts`
- Create: `packages/domain/test/unit/twap-voting-power.test.ts`

- [ ] Write tests: constant VP, VP changes mid-month, no VP before month
- [ ] Implement `computeTWAP(vpEvents, monthStart, monthEnd, initialVp)` → Wei
- [ ] Same step-function integration as TWB but over month window
- [ ] Run tests

### Task 3.5: Commit Phase 3

- [ ] `git add -A && git commit -m "phase 3: core domain calculations — active voters, pool sizing, TWB, TWAP"`

---

## Phase 4: Domain Allocation + Lottery

Pure functions for Steps 7–14.

### Task 4.1: Cap redistribution

**Files:**
- Create: `packages/domain/src/cap-redistribution.ts`
- Create: `packages/domain/test/unit/cap-redistribution.test.ts`

- [ ] Write tests: no one capped, one capped, multiple rounds of redistribution, all capped, dust assignment
- [ ] Implement `applyCapRedistribution(allocations, cap, weights)` → RewardAllocation[]
- [ ] Iterative: cap → redistribute excess pro-rata → repeat until stable
- [ ] Dust goes to largest uncapped allocation; ties broken by lowest address
- [ ] Property test: sum of output always equals sum of input
- [ ] Run tests

### Task 4.2: Voter reward allocation (Step 7)

**Files:**
- Create: `packages/domain/src/voter-rewards.ts`
- Create: `packages/domain/test/unit/voter-rewards.test.ts`

- [ ] Write tests: proportional allocation, cap enforcement
- [ ] Implement `computeVoterRewards(voterAVPs, poolSize)` → RewardAllocation[]
- [ ] Uses: 10% of pool, pro-rata by TWAP, cap at 1% of R
- [ ] Run tests

### Task 4.3: Token-holder reward allocation (Step 11)

**Files:**
- Create: `packages/domain/src/token-holder-rewards.ts`
- Create: `packages/domain/test/unit/token-holder-rewards.test.ts`

- [ ] Write tests: proportional allocation, cap enforcement
- [ ] Implement `computeTokenHolderRewards(tokenHolderTWBs, poolSize)` → RewardAllocation[]
- [ ] Uses: 90% of pool, pro-rata by TWB, cap at 5% of R
- [ ] Run tests

### Task 4.4: Protocol deduplication + consolidation (Steps 8-9)

**Files:**
- Create: `packages/domain/src/consolidation.ts`
- Create: `packages/domain/test/unit/consolidation.test.ts`

- [ ] Write tests: direct only, mixed sources, Hedgey resolution, wallet aliases, transitive aliases, cycle detection
- [ ] Implement `resolveEligibleTokenHolders(directTokenHolders, multiDelegatePositions, vestingContracts, vestingNftOwners)` → EligibleTokenHolder[]
- [ ] Implement `consolidateTokenHolders(eligible, walletAliases)` → ConsolidatedTokenHolder[]
- [ ] Implement `resolveAliases(address, aliasMap)` with cycle detection
- [ ] Run tests

### Task 4.5: Lottery (Step 14)

**Files:**
- Create: `packages/domain/src/lottery.ts`
- Create: `packages/domain/test/unit/lottery.test.ts`

- [ ] Write tests: bucket formation (descending sort, overflow stays), winner selection, solo bucket, empty entries
- [ ] Implement `formBuckets(entries, bucketTarget)` → LotteryEntry[][]
- [ ] Implement `runLottery(entries, randaoValue)` → LotteryBucket[]
- [ ] Deterministic: keccak256(randao, bucketIndex) → winner via cumulative sum
- [ ] Run tests

### Task 4.6: Combine rewards + threshold (Steps 12-13)

**Files:**
- Create: `packages/domain/src/combine-rewards.ts`
- Create: `packages/domain/test/unit/combine-rewards.test.ts`

- [ ] Write tests: voter only, token holder only, both, threshold split
- [ ] Implement `combineRewards(voterRewards, tokenHolderRewards)` → CombinedReward[]
- [ ] Implement `applyThreshold(combined, minPayout)` → { directPayouts, lotteryEntries }
- [ ] Run tests

### Task 4.7: Commit Phase 4

- [ ] `git add -A && git commit -m "phase 4: allocation, cap redistribution, lottery, consolidation"`

---

## Phase 5: Pipeline + Distribution

Full pipeline orchestrator, adapters, output writers.

### Task 5.1: Pipeline orchestrator (all 15 steps)

**Files:**
- Create: `packages/domain/src/pipeline.ts`
- Create: `packages/domain/test/integration/pipeline.test.ts`

- [ ] Implement `runDistributionPipeline(month, dataSource)` → DistributionResult
- [ ] Steps 1-15 in sequence, calling all domain functions
- [ ] Integration test with mock data source covering full happy path
- [ ] Run tests

### Task 5.2: Data source adapters

**Files:**
- Create: `apps/backend/src/adapters/proposal-adapter.ts`
- Create: `apps/backend/src/adapters/vote-adapter.ts`
- Create: `apps/backend/src/adapters/voting-power-adapter.ts`
- Create: `apps/backend/src/adapters/balance-adapter.ts`
- Create: `apps/backend/src/adapters/delegation-adapter.ts`
- Create: `apps/backend/src/adapters/multi-delegate-adapter.ts`
- Create: `apps/backend/src/adapters/vesting-adapter.ts`
- Create: `apps/backend/src/adapters/block-adapter.ts`
- Create: `apps/backend/src/adapters/wallet-alias-adapter.ts`
- Create: `apps/backend/src/adapters/data-source.ts`

- [ ] Implement each adapter querying Ponder's Drizzle schema
- [ ] `data-source.ts` composes all adapters into IncentivesDataSource
- [ ] Run typecheck

### Task 5.3: JSON + CSV output writers

**Files:**
- Create: `apps/backend/src/output/json-writer.ts`
- Create: `apps/backend/src/output/csv-writer.ts`
- Create: `apps/backend/test/unit/output/json-writer.test.ts`
- Create: `apps/backend/test/unit/output/csv-writer.test.ts`

- [ ] JSON writer: DistributionResult → JSON file matching PRD Section 4 schema
- [ ] CSV writer: DistributionResult → CSV with columns: address, voter_reward, token_holder_reward, combined_reward, role, payout_type
- [ ] Tests for both
- [ ] Run tests

### Task 5.4: Distribution script

**Files:**
- Create: `scripts/run-distribution.ts`

- [ ] Script entry point: reads ROUND_MONTHS from config, runs pipeline for completed months, writes JSON output to `distributions/{month}.json`
- [ ] Run typecheck

### Task 5.5: Commit Phase 5

- [ ] `git add -A && git commit -m "phase 5: pipeline orchestrator, adapters, output writers, distribution script"`

---

## Phase 6: API Endpoints

Hono REST API serving frontend.

### Task 6.1: API setup + health

**Files:**
- Create: `apps/backend/src/api/index.ts`
- Create: `apps/backend/src/api/schemas.ts`
- Create: `apps/backend/src/api/routes/health.ts`

- [ ] Hono app setup with OpenAPI + Swagger UI
- [ ] Health endpoint
- [ ] Run typecheck

### Task 6.2: Active voters endpoint

**Files:**
- Create: `apps/backend/src/api/routes/delegates.ts`

- [ ] `GET /voters/active` — list active voters with VP, vote count, token-holder count
- [ ] Run typecheck

### Task 6.3: Eligibility endpoint

**Files:**
- Create: `apps/backend/src/api/routes/eligibility.ts`

- [ ] `GET /eligibility/:address` — check delegation to active voter
- [ ] Run typecheck

### Task 6.4: Reward estimate + APY endpoints

**Files:**
- Create: `apps/backend/src/api/routes/rewards.ts`
- Create: `apps/backend/src/api/routes/apy.ts`

- [ ] `GET /rewards/estimate/:address` — estimated voter + token-holder reward
- [ ] `GET /apy/estimate/:address` — projected APY per tier
- [ ] Run typecheck

### Task 6.5: Round + tiers endpoints

**Files:**
- Create: `apps/backend/src/api/routes/rounds.ts`
- Create: `apps/backend/src/api/routes/tiers.ts`

- [ ] `GET /rounds/current` — month, days remaining, VP growth, tier
- [ ] `GET /tiers` — full tier table with current progress
- [ ] Run typecheck

### Task 6.6: Distribution endpoints

**Files:**
- Create: `apps/backend/src/api/routes/distributions.ts`

- [ ] `GET /distributions` — list past months
- [ ] `GET /distributions/:month` — full results JSON
- [ ] `GET /distributions/:month/csv` — CSV export
- [ ] Run typecheck

### Task 6.7: Register all routes

**Files:**
- Modify: `apps/backend/src/api/index.ts`

- [ ] Wire all route modules into the Hono app
- [ ] Verify OpenAPI spec generates at `/docs/json`
- [ ] Run typecheck for full backend
- [ ] Run all tests: `pnpm test`

### Task 6.8: Commit Phase 6

- [ ] `git add -A && git commit -m "phase 6: REST API endpoints — delegates, eligibility, rewards, APY, rounds, tiers, distributions"`
