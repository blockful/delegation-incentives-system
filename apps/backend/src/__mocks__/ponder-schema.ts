/**
 * Mock for ponder:schema — each table is a lightweight object with _tableName
 * so that resolveTableName() in test fakes can look up the correct store.
 */
function makeTable(name: string) {
  return { _tableName: name };
}

// ERC20MultiDelegate
export const multiDelegateProxy = makeTable("multi_delegate_proxy");
export const multiDelegatePosition = makeTable("multi_delegate_position");
export const multiDelegateTransfer = makeTable("multi_delegate_transfer");

// Hedgey Vesting
export const vestingPlan = makeTable("vesting_plan");
export const vestingNftOwnership = makeTable("vesting_nft_ownership");
export const vestingRedemption = makeTable("vesting_redemption");

// ENS Token
export const ensBalance = makeTable("ens_balance");
export const ensBalanceEvent = makeTable("ens_balance_event");
export const ensDelegation = makeTable("ens_delegation");
export const ensDelegationEvent = makeTable("ens_delegation_event");
export const ensVotingPowerSnapshot = makeTable("ens_voting_power_snapshot");

// ENS Governor
export const governanceProposal = makeTable("governance_proposal");
export const governanceVote = makeTable("governance_vote");

// Protocol mapping
export const protocolMapping = makeTable("protocol_mapping");

// Note: `walletAlias` and `distributionResult` moved to src/db/app-tables.ts —
// they are no longer Ponder onchainTables. See ponder.schema.ts for rationale.
