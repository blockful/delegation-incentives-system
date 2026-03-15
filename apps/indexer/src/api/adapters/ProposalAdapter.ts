import type { ProposalRepository, Proposal } from "@ens-dis/domain"
import { seconds } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class ProposalAdapter implements ProposalRepository {
  constructor(private db: PonderDb) {}

  async getRecentProposals(count: number): Promise<Proposal[]> {
    const rows = await this.db
      .select()
      .from("governance_proposal")
      .where((r: Row) => r["status"] !== "active")
      .orderBy({ field: "timestamp", dir: "desc" })
      .limit(count)

    return rows.map((row: Row) => ({
      id: row["id"] as string,
      status: row["status"] as string,
      timestamp: seconds(BigInt(row["timestamp"] as string | number | bigint)),
      endTimestamp: seconds(BigInt(row["endBlock"] as string | number | bigint)),
      daoId: "ens",
    }))
  }
}
