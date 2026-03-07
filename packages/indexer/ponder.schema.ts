import { onchainTable, index } from "@ponder/core";

// ERC20MultiDelegate tables

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

// Hedgey Vesting tables

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

// Protocol mapping table — maps proxy/contract addresses to real owners
// This is the output consumed by the backend for deduplication
export const protocolMapping = onchainTable("protocol_mapping", (t) => ({
  id: t.text().primaryKey(),           // child address
  childAddress: t.text().notNull(),
  operatorAddress: t.text().notNull(),
  protocol: t.text().notNull(),        // "multi_delegate" | "hedgey_vesting"
}), (table) => ({
  operatorIdx: index().on(table.operatorAddress),
  protocolIdx: index().on(table.protocol),
}));
