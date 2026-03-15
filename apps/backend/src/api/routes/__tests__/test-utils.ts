import { vi } from "vitest"
import { seconds, wei } from "@ens-dis/domain"

/** Minimal proposal array for mocking `getRecentProposals`. */
export const makeProposals = (n = 10) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${i + 1}`,
    status: "executed",
    timestamp: seconds(BigInt(1000 + i)),
    endBlock: BigInt(2000 + i),
    daoId: "ens",
  }))

/** Cross-voter vote array for mocking `getVotesForProposals`. */
export const makeVotes = (voterIds: string[], proposalIds: string[]) =>
  voterIds.flatMap((voter) =>
    proposalIds.map((proposalId) => ({
      voterAccountId: voter,
      proposalId,
      support: 1,
      votingPower: wei(100n),
      timestamp: seconds(1000n),
    })),
  )
