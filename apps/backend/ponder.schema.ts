import { onchainTable, index } from "ponder";

// ─── ERC20MultiDelegate tables ──────────────────────────────────────────────

export const multiDelegateProxy = onchainTable("multi_delegate_proxy", (t) => ({
  id: t.text().primaryKey(),           // proxy address
  delegate: t.text().notNull(),
  deployer: t.text().notNull(),         // derived from context
  createdAtBlock: t.bigint().notNull(),
}), (table) => ({
  delegateIdx: index().on(table.delegate),
}));

export const multiDelegatePosition = onchainTable("multi_delegate_position", (t) => ({
  id: t.text().primaryKey(),           // `${owner}-${delegate}`
  owner: t.text().notNull(),
  delegate: t.text().notNull(),
  amount: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
}), (table) => ({
  ownerIdx: index().on(table.owner),
  delegateIdx: index().on(table.delegate),
}));

export const multiDelegateTransfer = onchainTable("multi_delegate_transfer", (t) => ({
  id: t.text().primaryKey(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  delegate: t.text().notNull(),        // delegate address (derived from token id)
  amount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  fromIdx: index().on(table.from),
  toIdx: index().on(table.to),
  delegateIdx: index().on(table.delegate),
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
}), (table) => ({
  recipientIdx: index().on(table.recipient),
  tokenIdx: index().on(table.token),
}));

export const vestingRedemption = onchainTable("vesting_redemption", (t) => ({
  id: t.text().primaryKey(),           // `${planId}-${blockNumber}`
  planId: t.bigint().notNull(),
  amountRedeemed: t.bigint().notNull(),
  planRemainder: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
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
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  accountIdx: index().on(table.accountId),
  timestampIdx: index().on(table.timestamp),
  accountTimestampIdx: index().on(table.accountId, table.timestamp),
}));

/** Current delegation mapping — who each address delegates to */
export const ensDelegation = onchainTable("ens_delegation", (t) => ({
  id: t.text().primaryKey(),           // delegator address
  delegateId: t.text().notNull(),      // current delegate
  lastUpdatedBlock: t.bigint().notNull(),
}), (table) => ({
  delegateIdx: index().on(table.delegateId),
}));

/** Historical delegation changes from DelegateChanged events */
export const ensDelegationEvent = onchainTable("ens_delegation_event", (t) => ({
  id: t.text().primaryKey(),           // `${txHash}-${logIndex}`
  delegatorId: t.text().notNull(),
  fromDelegateId: t.text().notNull(),
  toDelegateId: t.text().notNull(),
  delegatedValue: t.bigint().notNull(), // delegator's token balance at time of delegation
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  delegatorIdx: index().on(table.delegatorId),
  toDelegateIdx: index().on(table.toDelegateId),
  timestampIdx: index().on(table.timestamp),
}));

/** Voting power snapshots from DelegateVotesChanged events */
export const ensVotingPowerSnapshot = onchainTable("ens_voting_power_snapshot", (t) => ({
  id: t.text().primaryKey(),           // `${txHash}-${logIndex}`
  accountId: t.text().notNull(),       // delegate whose VP changed
  votingPower: t.bigint().notNull(),   // new voting power
  delta: t.bigint().notNull(),         // change (newBalance - previousBalance)
  deltaMod: t.bigint().notNull(),      // absolute value of delta (for sorting/filtering)
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}), (table) => ({
  accountIdx: index().on(table.accountId),
  timestampIdx: index().on(table.timestamp),
  accountTimestampIdx: index().on(table.accountId, table.timestamp),
}));

// ─── ENS Governor tables ─────────────────────────────────────────────────────

export const governanceProposal = onchainTable("governance_proposal", (t) => ({
  id: t.text().primaryKey(),            // BigInt(proposalId).toString()
  proposer: t.text().notNull(),         // lowercase 0x address
  startBlock: t.bigint().notNull(),
  endBlock: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  description: t.text().notNull(),
  status: t.text().notNull(),           // "active" | "executed" | "defeated" | "canceled"
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

// ─── Wallet alias table (manually curated — stored via offchain writes) ──────

export const walletAlias = onchainTable("wallet_alias", (t) => ({
  secondaryAddress: t.text().primaryKey(),
  primaryAddress: t.text().notNull(),
  source: t.text().notNull(),
}));

// ─── Distribution result table (computed API state) ──────────────────────────

export const distributionResult = onchainTable("distribution_result", (t) => ({
  month: t.text().primaryKey(),
  resultJson: t.text().notNull(),
  computedAt: t.bigint().notNull(),
}));
