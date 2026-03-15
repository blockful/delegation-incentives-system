// Mock for ponder:schema used in unit tests.
// Each exported table is a sentinel string so the fake-db in tests can
// switch on the table identity with a simple === check.

export const governanceProposal = "governance_proposal" as const
export const governanceVote = "governance_vote" as const

// Stub out other tables that other handlers import from ponder:schema
export const multiDelegateProxy = "multi_delegate_proxy" as const
export const multiDelegatePosition = "multi_delegate_position" as const
export const multiDelegateTransfer = "multi_delegate_transfer" as const
export const vestingPlan = "vesting_plan" as const
export const vestingRedemption = "vesting_redemption" as const
export const ensBalance = "ens_balance" as const
export const ensBalanceEvent = "ens_balance_event" as const
export const ensDelegation = "ens_delegation" as const
export const ensDelegationEvent = "ens_delegation_event" as const
export const ensVotingPowerSnapshot = "ens_voting_power_snapshot" as const
export const protocolMapping = "protocol_mapping" as const
export const walletAlias = "wallet_alias" as const
export const distributionResult = "distribution_result" as const

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
