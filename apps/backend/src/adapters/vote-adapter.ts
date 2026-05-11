import type { db as PonderDb } from "ponder:api";
import { inArray } from "drizzle-orm";
import { governanceVote } from "ponder:schema";
import type { VoteRepository } from "@ens-dis/domain";
import type { Address, Vote, Seconds } from "@ens-dis/domain";
import { wei, seconds } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createVoteAdapter(db: Db): VoteRepository {
  return {
    async getVotesForProposals(
      proposalIds: readonly string[],
    ): Promise<readonly Vote[]> {
      if (proposalIds.length === 0) return [];

      const rows = await db
        .select()
        .from(governanceVote)
        .where(inArray(governanceVote.proposalId, [...proposalIds]));

      return rows.map((row) => ({
        voter: row.voter as Address,
        proposalId: row.proposalId,
        support: row.support,
        weight: wei(BigInt(row.weight)),
        timestamp: seconds(BigInt(row.timestamp)),
      }));
    },
  };
}
