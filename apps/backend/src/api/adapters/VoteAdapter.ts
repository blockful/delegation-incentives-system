import type { VoteRepository, Vote, Seconds } from "@ens-dis/domain"
import { wei, seconds } from "@ens-dis/domain"
import { inArray } from "drizzle-orm"
import { governanceVote } from "ponder:schema"

type GovernanceVoteRow = typeof governanceVote.$inferSelect

export class VoteAdapter implements VoteRepository {
  constructor(private db: any) {}

  async getVotesForProposals(proposalIds: string[]): Promise<Vote[]> {
    if (proposalIds.length === 0) return []

    const rows: GovernanceVoteRow[] = await this.db
      .select()
      .from(governanceVote)
      .where(inArray(governanceVote.proposalId, proposalIds))

    return rows.map((row) => ({
      proposalId: row.proposalId,
      voterAccountId: row.voter.toLowerCase(),
      support: row.support,
      // weight is numeric (string) in postgres — cast to bigint
      votingPower: wei(BigInt(row.weight)),
      timestamp: seconds(row.timestamp),
    }))
  }

  async getEarliestVoteTimestamps(voterIds: string[]): Promise<Map<string, Seconds>> {
    if (voterIds.length === 0) return new Map()

    const lowerIds = voterIds.map((id) => id.toLowerCase())
    const rows: GovernanceVoteRow[] = await this.db
      .select()
      .from(governanceVote)
      .where(inArray(governanceVote.voter, lowerIds))

    const result = new Map<string, Seconds>()
    for (const row of rows) {
      const voter = row.voter.toLowerCase()
      const ts = seconds(row.timestamp)
      const existing = result.get(voter)
      if (existing === undefined || ts < existing) {
        result.set(voter, ts)
      }
    }
    return result
  }
}
