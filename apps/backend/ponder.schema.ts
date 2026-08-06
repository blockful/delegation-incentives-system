import { onchainTable, onchainEnum, index } from "ponder";

// ─── ERC20MultiDelegate tables ──────────────────────────────────────────────

export const multiDelegateProxy = onchainTable("multi_delegate_proxy", (t) => ({
  id: t.text().primaryKey(),           // proxy address
  voter: t.text().notNull(),
  deployer: t.text().notNull(),         // derived from context
  createdAtBlock: t.bigint().notNull(),
}), (table) => ({
  voterIdx: index().on(table.voter),
}));

export const multiDelegatePosition = onchainTable("multi_delegate_position", (t) => ({
  id: t.text().primaryKey(),           // `${owner}-${voter}`
  owner: t.text().notNull(),
  voter: t.text().notNull(),
  amount: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
}), (table) => ({
  ownerIdx: index().on(table.owner),
  voterIdx: index().on(table.voter),
}));

export const multiDelegateTransfer = onchainTable("multi_delegate_transfer", (t) => ({
  id: t.text().primaryKey(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  voter: t.text().notNull(),           // voter address (derived from token id)
  amount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  voterIdx: index().on(table.voter),
  timestampIdx: index().on(table.timestamp),
}));

// ─── Hedgey Vesting tables ──────────────────────────────────────────────────

export const vestingPlan = onchainTable("vesting_plan", (t) => ({
  id: t.bigint().primaryKey(),         // plan ID
  recipient: t.text().notNull(),       // current NFT holder
  token: t.text().notNull(),
  amount: t.bigint().notNull(),        // original total
  start: t.bigint().notNull(),
  cliff: t.bigint().notNull(),
  rate: t.bigint().notNull(),          // tokens per period
  period: t.bigint().notNull(),
  amountRedeemed: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  createdAtLogIndex: t.integer().notNull(),
}), (table) => ({
  recipientIdx: index().on(table.recipient),
  tokenIdx: index().on(table.token),
}));

export const vestingNftOwnership = onchainTable("vesting_nft_ownership", (t) => ({
  id: t.text().primaryKey(),            // `${planId}-${blockNumber}-${logIndex}`
  planId: t.bigint().notNull(),
  owner: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  planIdIdx: index().on(table.planId),
  timestampIdx: index().on(table.timestamp),
}));

export const vestingRedemption = onchainTable("vesting_redemption", (t) => ({
  id: t.text().primaryKey(),           // `${planId}-${blockNumber}`
  planId: t.bigint().notNull(),
  amountRedeemed: t.bigint().notNull(),
  planRemainder: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  planIdIdx: index().on(table.planId),
  timestampIdx: index().on(table.timestamp),
}));

// ─── Hedgey Voting Lockup tables (VotingTokenLockupPlans) ───────────────────
//
// Unlike the vesting master contract (which custodies every plan's tokens
// itself), each voting-enabled lockup plan holds its tokens in a dedicated
// per-plan VotingVault contract, and it is the VAULT address that appears as
// the on-chain DelegateChanged delegator. The vault→plan mapping below is what
// keeps those vaults out of the direct-holder set and routes their rewards to
// the plan-NFT owner.

export const lockupPlan = onchainTable("lockup_plan", (t) => ({
  id: t.bigint().primaryKey(),         // plan / NFT ID
  recipient: t.text().notNull(),       // current NFT holder
  token: t.text().notNull(),
  amount: t.bigint().notNull(),        // locked amount at plan creation
  start: t.bigint().notNull(),
  cliff: t.bigint().notNull(),
  rate: t.bigint().notNull(),          // tokens per period
  period: t.bigint().notNull(),
  // Running locked remainder — decreased by redemptions/segments, increased
  // by combines. Snapshotted into lockup_balance_event when the plan's
  // voting vault is funded.
  remainder: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  createdAtLogIndex: t.integer().notNull(),
}), (table) => ({
  recipientIdx: index().on(table.recipient),
  tokenIdx: index().on(table.token),
}));

/** Per-plan VotingVault — one vault per plan (enforced on-chain). */
export const lockupVotingVault = onchainTable("lockup_voting_vault", (t) => ({
  id: t.bigint().primaryKey(),         // plan ID (one vault per plan)
  vaultAddress: t.text().notNull(),    // lowercase vault contract address
  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  createdAtLogIndex: t.integer().notNull(),
}), (table) => ({
  vaultAddressIdx: index().on(table.vaultAddress),
}));

export const lockupNftOwnership = onchainTable("lockup_nft_ownership", (t) => ({
  id: t.text().primaryKey(),            // `${planId}-${blockNumber}-${logIndex}`
  planId: t.bigint().notNull(),
  owner: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  planIdIdx: index().on(table.planId),
  timestampIdx: index().on(table.timestamp),
}));

/**
 * Locked-remainder history per plan — one row per balance-changing event
 * (vault funding, redemption, segmentation, combination). `planRemainder`
 * is the locked amount AFTER the event; feeds per-plan TWB.
 */
export const lockupBalanceEvent = onchainTable("lockup_balance_event", (t) => ({
  id: t.text().primaryKey(),           // `${planId}-${blockNumber}-${logIndex}`
  planId: t.bigint().notNull(),
  planRemainder: t.bigint().notNull(),
  kind: t.text().notNull(),            // "vault_funded" | "redemption" | "segment" | "combine"
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
}), (table) => ({
  planIdIdx: index().on(table.planId),
  timestampIdx: index().on(table.timestamp),
}));

// ─── ENS Token tables ───────────────────────────────────────────────────────

/** Current ENS token balance per address (running state) */
export const ensBalance = onchainTable("ens_balance", (t) => ({
  id: t.text().primaryKey(),           // address
  balance: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
}));

/** Historical ENS token balance changes — one row per Transfer event per affected address */
export const ensBalanceEvent = onchainTable("ens_balance_event", (t) => ({
  id: t.text().primaryKey(),           // `${txHash}-${logIndex}-${from|to}`
  accountId: t.text().notNull(),
  balance: t.bigint().notNull(),       // balance AFTER the transfer
  delta: t.bigint().notNull(),         // signed change (negative for sender)
  deltaMod: t.bigint().notNull(),      // absolute value of delta (for sorting/filtering)
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  accountIdx: index().on(table.accountId),
  timestampIdx: index().on(table.timestamp),
  accountTimestampIdx: index().on(table.accountId, table.timestamp),
}));

/** Current delegation mapping — who each token-holder address delegates to */
export const ensDelegation = onchainTable("ens_delegation", (t) => ({
  id: t.text().primaryKey(),           // token-holder address
  voterId: t.text().notNull(),         // current voter (recipient of delegation)
  lastUpdatedBlock: t.bigint().notNull(),
}), (table) => ({
  voterIdx: index().on(table.voterId),
}));

/** Historical delegation changes from DelegateChanged events */
export const ensDelegationEvent = onchainTable("ens_delegation_event", (t) => ({
  id: t.text().primaryKey(),           // `${txHash}-${logIndex}`
  tokenHolderId: t.text().notNull(),
  fromVoterId: t.text().notNull(),
  toVoterId: t.text().notNull(),
  delegatedValue: t.bigint().notNull(), // token-holder's balance at time of delegation
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  tokenHolderIdx: index().on(table.tokenHolderId),
  toVoterIdx: index().on(table.toVoterId),
  timestampIdx: index().on(table.timestamp),
}));

/** Voting power snapshots from DelegateVotesChanged events */
export const ensVotingPowerSnapshot = onchainTable("ens_voting_power_snapshot", (t) => ({
  id: t.text().primaryKey(),           // `${txHash}-${logIndex}`
  voterId: t.text().notNull(),         // voter whose VP changed
  votingPower: t.bigint().notNull(),   // new voting power
  delta: t.bigint().notNull(),         // change (newBalance - previousBalance)
  deltaMod: t.bigint().notNull(),      // absolute value of delta (for sorting/filtering)
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  voterIdx: index().on(table.voterId),
  timestampIdx: index().on(table.timestamp),
  voterTimestampIdx: index().on(table.voterId, table.timestamp),
}));

// ─── ENS Governor tables ─────────────────────────────────────────────────────

export const proposalStatusEnum = onchainEnum("proposal_status", [
  "pending",
  "active",
  "canceled",
  "defeated",
  "succeeded",
  "queued",
  "expired",
  "executed",
]);

export const governanceProposal = onchainTable("governance_proposal", (t) => ({
  id: t.text().primaryKey(),            // BigInt(proposalId).toString()
  proposer: t.text().notNull(),         // lowercase 0x address
  startBlock: t.bigint().notNull(),
  endBlock: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  description: t.text().notNull(),
  status: proposalStatusEnum("status").notNull(),
  finalizedTimestamp: t.bigint(),       // timestamp of status-changing event (null while active/pending)
}), (table) => ({
  statusIdx: index().on(table.status),
  timestampIdx: index().on(table.timestamp),
}));

export const governanceVote = onchainTable(
  "governance_vote",
  (t) => ({
    id: t.text().primaryKey(),          // "${proposalId}-${voter}"
    proposalId: t.text().notNull(),     // decimal string
    voter: t.text().notNull(),          // lowercase 0x address
    support: t.integer().notNull(),     // 0=Against, 1=For, 2=Abstain
    weight: t.numeric({ precision: 78, scale: 0 }).notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    proposalIdIdx: index().on(table.proposalId),
    voterIdx: index().on(table.voter),
  }),
);

// ─── Protocol mapping (output for backend deduplication) ────────────────────

export const protocolMapping = onchainTable("protocol_mapping", (t) => ({
  id: t.text().primaryKey(),
  childAddress: t.text().notNull(),
  operatorAddress: t.text().notNull(),
  protocol: t.text().notNull(),        // "multi_delegate" | "hedgey_vesting"
}), (table) => ({
  childIdx: index().on(table.childAddress),
  operatorIdx: index().on(table.operatorAddress),
  protocolIdx: index().on(table.protocol),
}));
