import type { IncentivesDataSource } from "@ens-dis/domain"
import { db, publicClients } from "ponder:api"
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
 * Imports db and publicClient directly from ponder:api.
 */
export function buildDataSource(): IncentivesDataSource {
  return {
    proposals: new ProposalAdapter(db),
    votes: new VoteAdapter(db),
    votingPower: new VotingPowerAdapter(db),
    balances: new BalanceAdapter(db),
    delegations: new DelegationAdapter(db),
    protocolMappings: new ProtocolMappingAdapter(db),
    walletAliases: new WalletAliasAdapter(db),
    blocks: new BlockAdapter(publicClients.mainnet as any),
    distributions: new DistributionAdapter(db),
  }
}
