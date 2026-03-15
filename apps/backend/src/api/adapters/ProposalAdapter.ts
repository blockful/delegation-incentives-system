import type { ProposalRepository, Proposal } from "@ens-dis/domain"
import { seconds } from "@ens-dis/domain"
import { ne, desc, or, lte } from "drizzle-orm"
import { governanceProposal } from "ponder:schema"

type GovernanceProposalRow = typeof governanceProposal.$inferSelect

export class ProposalAdapter implements ProposalRepository {
  constructor(private db: any) {}

  async getRecentProposals(count: number): Promise<Proposal[]> {
    // Some proposals get stuck as 'active' even after voting ends (e.g. passed
    // but unexecutable). Detect them by finding the highest end_block among
    // proposals that were explicitly resolved — any 'active' proposal with a
    // lower end_block has concluded voting regardless of its status field.
    const [latestResolved]: GovernanceProposalRow[] = await this.db
      .select()
      .from(governanceProposal)
      .where(ne(governanceProposal.status, "active"))
      .orderBy(desc(governanceProposal.endBlock))
      .limit(1)

    const maxResolvedEndBlock = latestResolved?.endBlock ?? 0n

    const rows: GovernanceProposalRow[] = await this.db
      .select()
      .from(governanceProposal)
      .where(
        or(
          ne(governanceProposal.status, "active"),
          lte(governanceProposal.endBlock, maxResolvedEndBlock),
        ),
      )
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
