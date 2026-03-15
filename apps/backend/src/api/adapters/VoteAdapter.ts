import type { VoteRepository, Vote } from "@ens-dis/domain"
import { wei, seconds } from "@ens-dis/domain"
import { inArray } from "drizzle-orm"
import { governanceVote } from "ponder:schema"

export class VoteAdapter implements VoteRepository {
  constructor(private db: any) {}

  async getVotesForProposals(proposalIds: string[]): Promise<Vote[]> {
    if (proposalIds.length === 0) return []

    const rows = await this.db
      .select()
      .from(governanceVote)
      .where(inArray(governanceVote.proposalId, proposalIds))

    return rows.map((row: any) => ({
      proposalId: row.proposalId as string,
      voterAccountId: (row.voter as string).toLowerCase(),
      support: row.support as number,
      // weight is stored as numeric string in real DB; bigint in fake
      votingPower: wei(BigInt(row.weight as string | number | bigint)),
      timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
    }))
  }
}
