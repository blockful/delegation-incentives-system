import type { IncentivesDataSource } from "@ens-dis/domain"
import type { PublicClient } from "viem"
import type { PonderDb } from "./adapters/types.js"
import { ProposalAdapter } from "./adapters/ProposalAdapter.js"
import { VoteAdapter } from "./adapters/VoteAdapter.js"
import { VotingPowerAdapter } from "./adapters/VotingPowerAdapter.js"
import { BalanceAdapter } from "./adapters/BalanceAdapter.js"
import { DelegationAdapter } from "./adapters/DelegationAdapter.js"
import { ProtocolMappingAdapter } from "./adapters/ProtocolMappingAdapter.js"
import { WalletAliasAdapter } from "./adapters/WalletAliasAdapter.js"
import { BlockAdapter } from "./adapters/BlockAdapter.js"
import { DistributionAdapter } from "./adapters/DistributionAdapter.js"

/**
 * Construct an IncentivesDataSource backed by Ponder's Drizzle db and a viem PublicClient.
 *
 * Pass db as a PonderDb-compatible object (e.g., wrapping db.sql from Ponder's context).
 */
export function buildDataSource(
  db: PonderDb,
  publicClient: PublicClient,
): IncentivesDataSource {
  return {
    proposals: new ProposalAdapter(db),
    votes: new VoteAdapter(db),
    votingPower: new VotingPowerAdapter(db),
    balances: new BalanceAdapter(db),
    delegations: new DelegationAdapter(db),
    protocolMappings: new ProtocolMappingAdapter(db),
    walletAliases: new WalletAliasAdapter(db),
    blocks: new BlockAdapter(publicClient),
    distributions: new DistributionAdapter(db),
  }
}
