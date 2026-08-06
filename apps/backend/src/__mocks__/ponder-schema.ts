/**
 * Mock for ponder:schema — each table is a lightweight object with _tableName
 * so that resolveTableName() in test fakes can look up the correct store.
 *
 * Tables whose adapters are unit-tested against FakePonderDb (which evaluates
 * real drizzle expressions) additionally need real drizzle column objects, so
 * those are declared with pgTable. Column SQL names deliberately match the row
 * property names used in test seeds (camelCase) so the expression interpreter
 * can read values straight off the seeded rows.
 */
import { pgTable, text, bigint, integer } from "drizzle-orm/pg-core";

function makeTable(name: string) {
  return { _tableName: name };
}

// ERC20MultiDelegate
export const multiDelegateProxy = makeTable("multi_delegate_proxy");
export const multiDelegatePosition = makeTable("multi_delegate_position");
export const multiDelegateTransfer = makeTable("multi_delegate_transfer");

// Hedgey Vesting — real drizzle columns: the vesting-adapter unit tests run
// the adapter's actual drizzle where/orderBy expressions against FakePonderDb.
export const vestingPlan = Object.assign(
  pgTable("vesting_plan", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    recipient: text("recipient").notNull(),
    token: text("token").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    amountRedeemed: bigint("amountRedeemed", { mode: "bigint" }).notNull(),
    createdAtBlock: bigint("createdAtBlock", { mode: "bigint" }).notNull(),
    createdAtTimestamp: bigint("createdAtTimestamp", { mode: "bigint" }).notNull(),
    createdAtLogIndex: integer("createdAtLogIndex").notNull(),
  }),
  { _tableName: "vesting_plan" },
);
export const vestingNftOwnership = Object.assign(
  pgTable("vesting_nft_ownership", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    owner: text("owner").notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "vesting_nft_ownership" },
);
export const vestingRedemption = Object.assign(
  pgTable("vesting_redemption", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    amountRedeemed: bigint("amountRedeemed", { mode: "bigint" }).notNull(),
    planRemainder: bigint("planRemainder", { mode: "bigint" }).notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "vesting_redemption" },
);

// Hedgey Voting Lockup (VotingTokenLockupPlans) — real drizzle columns for
// the same reason as the vesting tables above.
export const lockupPlan = Object.assign(
  pgTable("lockup_plan", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    recipient: text("recipient").notNull(),
    token: text("token").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    remainder: bigint("remainder", { mode: "bigint" }).notNull(),
    createdAtBlock: bigint("createdAtBlock", { mode: "bigint" }).notNull(),
    createdAtTimestamp: bigint("createdAtTimestamp", { mode: "bigint" }).notNull(),
    createdAtLogIndex: integer("createdAtLogIndex").notNull(),
  }),
  { _tableName: "lockup_plan" },
);
export const lockupVotingVault = Object.assign(
  pgTable("lockup_voting_vault", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    vaultAddress: text("vaultAddress").notNull(),
    createdAtBlock: bigint("createdAtBlock", { mode: "bigint" }).notNull(),
    createdAtTimestamp: bigint("createdAtTimestamp", { mode: "bigint" }).notNull(),
    createdAtLogIndex: integer("createdAtLogIndex").notNull(),
  }),
  { _tableName: "lockup_voting_vault" },
);
export const lockupNftOwnership = Object.assign(
  pgTable("lockup_nft_ownership", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    owner: text("owner").notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "lockup_nft_ownership" },
);
export const lockupBalanceEvent = Object.assign(
  pgTable("lockup_balance_event", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    planRemainder: bigint("planRemainder", { mode: "bigint" }).notNull(),
    kind: text("kind").notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "lockup_balance_event" },
);

// Hedgey Voting Vesting (VotingTokenVestingPlans) — mirrors the lockup table
// set (shared tables would collide on the bigint plan-id primary keys); real
// drizzle columns for the same reason as the tables above.
export const votingVestingPlan = Object.assign(
  pgTable("voting_vesting_plan", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    recipient: text("recipient").notNull(),
    token: text("token").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    remainder: bigint("remainder", { mode: "bigint" }).notNull(),
    createdAtBlock: bigint("createdAtBlock", { mode: "bigint" }).notNull(),
    createdAtTimestamp: bigint("createdAtTimestamp", { mode: "bigint" }).notNull(),
    createdAtLogIndex: integer("createdAtLogIndex").notNull(),
  }),
  { _tableName: "voting_vesting_plan" },
);
export const votingVestingVault = Object.assign(
  pgTable("voting_vesting_vault", {
    id: bigint("id", { mode: "bigint" }).primaryKey(),
    vaultAddress: text("vaultAddress").notNull(),
    createdAtBlock: bigint("createdAtBlock", { mode: "bigint" }).notNull(),
    createdAtTimestamp: bigint("createdAtTimestamp", { mode: "bigint" }).notNull(),
    createdAtLogIndex: integer("createdAtLogIndex").notNull(),
  }),
  { _tableName: "voting_vesting_vault" },
);
export const votingVestingNftOwnership = Object.assign(
  pgTable("voting_vesting_nft_ownership", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    owner: text("owner").notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "voting_vesting_nft_ownership" },
);
export const votingVestingBalanceEvent = Object.assign(
  pgTable("voting_vesting_balance_event", {
    id: text("id").primaryKey(),
    planId: bigint("planId", { mode: "bigint" }).notNull(),
    planRemainder: bigint("planRemainder", { mode: "bigint" }).notNull(),
    kind: text("kind").notNull(),
    blockNumber: bigint("blockNumber", { mode: "bigint" }).notNull(),
    logIndex: integer("logIndex").notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
  }),
  { _tableName: "voting_vesting_balance_event" },
);

// ENS Token
export const ensBalance = makeTable("ens_balance");
export const ensBalanceEvent = makeTable("ens_balance_event");
export const ensDelegation = makeTable("ens_delegation");
export const ensDelegationEvent = makeTable("ens_delegation_event");
export const ensVotingPowerSnapshot = makeTable("ens_voting_power_snapshot");

// ENS Governor
// governanceProposal carries real drizzle columns: the proposal-adapter unit
// tests run the adapter's actual drizzle where/orderBy expressions against
// FakePonderDb.
export const governanceProposal = Object.assign(
  pgTable("governance_proposal", {
    id: text("id").primaryKey(),
    proposer: text("proposer").notNull(),
    startBlock: bigint("startBlock", { mode: "bigint" }).notNull(),
    endBlock: bigint("endBlock", { mode: "bigint" }).notNull(),
    timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(),
    finalizedTimestamp: bigint("finalizedTimestamp", { mode: "bigint" }),
  }),
  { _tableName: "governance_proposal" },
);
export const governanceVote = makeTable("governance_vote");

// Protocol mapping — real drizzle columns: the vesting-adapter unit tests
// run getVestingContractAddresses' protocol filter against FakePonderDb.
export const protocolMapping = Object.assign(
  pgTable("protocol_mapping", {
    id: text("id").primaryKey(),
    childAddress: text("childAddress").notNull(),
    operatorAddress: text("operatorAddress").notNull(),
    protocol: text("protocol").notNull(),
  }),
  { _tableName: "protocol_mapping" },
);
