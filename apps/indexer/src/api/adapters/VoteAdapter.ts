import type { VoteRepository, Vote } from "@ens-dis/domain"
import { wei, seconds } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class VoteAdapter implements VoteRepository {
  constructor(private db: PonderDb) {}

  async getVotesForProposals(proposalIds: string[]): Promise<Vote[]> {
    const idSet = new Set(proposalIds)

    const rows = await this.db
      .select()
      .from("governance_vote")
      .where((r: Row) => idSet.has(r["proposalId"] as string))

    return rows.map((row: Row) => ({
      proposalId: row["proposalId"] as string,
      voterAccountId: (row["voter"] as string).toLowerCase(),
      support: row["support"] as number,
      // weight is stored as numeric string in real DB; bigint in fake
      votingPower: wei(BigInt(row["weight"] as string | number | bigint)),
      timestamp: seconds(BigInt(row["timestamp"] as string | number | bigint)),
    }))
  }
}
