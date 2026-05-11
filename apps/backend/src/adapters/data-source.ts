import type { db as PonderDb } from "ponder:api";
import type { PublicClient } from "viem";
import type { IncentivesDataSource } from "@ens-dis/domain";

import { createProposalAdapter } from "./proposal-adapter.js";
import { createVoteAdapter } from "./vote-adapter.js";
import { createVotingPowerAdapter } from "./voting-power-adapter.js";
import { createBalanceAdapter } from "./balance-adapter.js";
import { createDelegationAdapter } from "./delegation-adapter.js";
import { createMultiDelegateAdapter } from "./multi-delegate-adapter.js";
import { createVestingAdapter } from "./vesting-adapter.js";
import { createBlockAdapter } from "./block-adapter.js";
import { createWalletAliasAdapter } from "./wallet-alias-adapter.js";

type Db = typeof PonderDb;

/**
 * Compose all individual adapters into a single IncentivesDataSource.
 * This is the main entry point for wiring up the data layer.
 */
export function createDataSource(
  db: Db,
  client: PublicClient,
): IncentivesDataSource {
  const proposals = createProposalAdapter(db);
  const votes = createVoteAdapter(db);
  const votingPower = createVotingPowerAdapter(db);
  const balance = createBalanceAdapter(db);
  const delegation = createDelegationAdapter(db);
  const multiDelegate = createMultiDelegateAdapter(db);
  const vesting = createVestingAdapter(db);
  const block = createBlockAdapter(client);
  const walletAlias = createWalletAliasAdapter(db);

  return {
    // ProposalRepository
    getFinalizedProposals: proposals.getFinalizedProposals.bind(proposals),
    // VoteRepository
    getVotesForProposals: votes.getVotesForProposals.bind(votes),
    // VotingPowerRepository
    getVpEventsInRange: votingPower.getVpEventsInRange.bind(votingPower),
    getVpAtTimestamp: votingPower.getVpAtTimestamp.bind(votingPower),
    getAggregateVpAtTimestamp:
      votingPower.getAggregateVpAtTimestamp.bind(votingPower),
    // BalanceRepository
    getBalanceEventsInRange: balance.getBalanceEventsInRange.bind(balance),
    getBalanceAtTimestamp: balance.getBalanceAtTimestamp.bind(balance),
    // DelegationRepository
    getDelegationsToAtTimestamp:
      delegation.getDelegationsToAtTimestamp.bind(delegation),
    // MultiDelegateRepository
    getPositionsAtTimestamp:
      multiDelegate.getPositionsAtTimestamp.bind(multiDelegate),
    getErc1155BalanceEventsInRange:
      multiDelegate.getErc1155BalanceEventsInRange.bind(multiDelegate),
    getErc1155BalanceAtTimestamp:
      multiDelegate.getErc1155BalanceAtTimestamp.bind(multiDelegate),
    // VestingRepository
    getVestingContractAddresses:
      vesting.getVestingContractAddresses.bind(vesting),
    getNftOwnerAtTimestamp: vesting.getNftOwnerAtTimestamp.bind(vesting),
    getPlansForContracts: vesting.getPlansForContracts.bind(vesting),
    // BlockRepository
    getBlockForTimestamp: block.getBlockForTimestamp.bind(block),
    getRandaoValue: block.getRandaoValue.bind(block),
    // WalletAliasRepository
    getAliases: walletAlias.getAliases.bind(walletAlias),
  };
}
