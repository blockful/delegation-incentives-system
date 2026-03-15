// Mock for ponder:schema used in unit tests.
// Each exported table is an object with column accessors that are compatible
// with real drizzle-orm operators (eq, ne, inArray, lte, gte, desc, asc, etc.).
//
// The table object also has a _tableName sentinel so FakePonderDb can identify
// which in-memory store to query.

function mkTable<Cols extends Record<string, string>>(
  tableName: string,
  columns: Cols,
): { _tableName: string } & { [K in keyof Cols]: { name: string; fieldConfig: undefined } } {
  const table: any = { _tableName: tableName }
  for (const colName of Object.values(columns)) {
    table[colName] = { name: colName, fieldConfig: undefined }
  }
  return table
}

export const governanceProposal = mkTable("governance_proposal", {
  id: "id",
  proposer: "proposer",
  startBlock: "startBlock",
  endBlock: "endBlock",
  timestamp: "timestamp",
  description: "description",
  status: "status",
})

export const governanceVote = mkTable("governance_vote", {
  id: "id",
  proposalId: "proposalId",
  voter: "voter",
  support: "support",
  weight: "weight",
  timestamp: "timestamp",
})

export const multiDelegateProxy = mkTable("multi_delegate_proxy", {
  id: "id",
  delegate: "delegate",
  deployer: "deployer",
  createdAtBlock: "createdAtBlock",
})

export const multiDelegatePosition = mkTable("multi_delegate_position", {
  id: "id",
  owner: "owner",
  delegate: "delegate",
  amount: "amount",
  lastUpdatedBlock: "lastUpdatedBlock",
})

export const multiDelegateTransfer = mkTable("multi_delegate_transfer", {
  id: "id",
  from: "from",
  to: "to",
  delegate: "delegate",
  amount: "amount",
  blockNumber: "blockNumber",
  timestamp: "timestamp",
  transactionHash: "transactionHash",
})

export const vestingPlan = mkTable("vesting_plan", {
  id: "id",
  recipient: "recipient",
  token: "token",
  amount: "amount",
  start: "start",
  cliff: "cliff",
  rate: "rate",
  period: "period",
  amountRedeemed: "amountRedeemed",
  createdAtBlock: "createdAtBlock",
})

export const vestingRedemption = mkTable("vesting_redemption", {
  id: "id",
  planId: "planId",
  amountRedeemed: "amountRedeemed",
  planRemainder: "planRemainder",
  blockNumber: "blockNumber",
  timestamp: "timestamp",
})

export const ensBalance = mkTable("ens_balance", {
  id: "id",
  balance: "balance",
  lastUpdatedBlock: "lastUpdatedBlock",
})

export const ensBalanceEvent = mkTable("ens_balance_event", {
  id: "id",
  accountId: "accountId",
  balance: "balance",
  delta: "delta",
  deltaMod: "deltaMod",
  blockNumber: "blockNumber",
  timestamp: "timestamp",
  transactionHash: "transactionHash",
})

export const ensDelegation = mkTable("ens_delegation", {
  id: "id",
  delegateId: "delegateId",
  lastUpdatedBlock: "lastUpdatedBlock",
})

export const ensDelegationEvent = mkTable("ens_delegation_event", {
  id: "id",
  delegatorId: "delegatorId",
  fromDelegateId: "fromDelegateId",
  toDelegateId: "toDelegateId",
  delegatedValue: "delegatedValue",
  blockNumber: "blockNumber",
  timestamp: "timestamp",
  transactionHash: "transactionHash",
})

export const ensVotingPowerSnapshot = mkTable("ens_voting_power_snapshot", {
  id: "id",
  accountId: "accountId",
  votingPower: "votingPower",
  delta: "delta",
  deltaMod: "deltaMod",
  blockNumber: "blockNumber",
  timestamp: "timestamp",
  transactionHash: "transactionHash",
})

export const protocolMapping = mkTable("protocol_mapping", {
  id: "id",
  childAddress: "childAddress",
  operatorAddress: "operatorAddress",
  protocol: "protocol",
})

export const walletAlias = mkTable("wallet_alias", {
  secondaryAddress: "secondaryAddress",
  primaryAddress: "primaryAddress",
  source: "source",
})

export const distributionResult = mkTable("distribution_result", {
  month: "month",
  resultJson: "resultJson",
  computedAt: "computedAt",
})

// Default export used by some handlers: import schema from "ponder:schema"
const schema = {
  governanceProposal,
  governanceVote,
  multiDelegateProxy,
  multiDelegatePosition,
  multiDelegateTransfer,
  vestingPlan,
  vestingRedemption,
  ensBalance,
  ensBalanceEvent,
  ensDelegation,
  ensDelegationEvent,
  ensVotingPowerSnapshot,
  protocolMapping,
  walletAlias,
  distributionResult,
}

export default schema
