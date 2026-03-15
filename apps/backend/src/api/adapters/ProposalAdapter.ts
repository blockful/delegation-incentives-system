import type { ProposalRepository, Proposal } from "@ens-dis/domain"
import { seconds } from "@ens-dis/domain"
import { desc } from "drizzle-orm"
import { governanceProposal } from "ponder:schema"

type GovernanceProposalRow = typeof governanceProposal.$inferSelect

export class ProposalAdapter implements ProposalRepository {
  constructor(private db: any) {}

  async getRecentProposals(count: number): Promise<Proposal[]> {
    const rows: GovernanceProposalRow[] = await this.db
      .select()
      .from(governanceProposal)
      .orderBy(desc(governanceProposal.timestamp))
      .limit(count)

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      timestamp: seconds(row.timestamp),
      endBlock: row.endBlock,
      daoId: "ens",
    }))
  }
}
