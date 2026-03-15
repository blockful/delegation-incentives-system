import type { ProposalRepository, Proposal } from "@ens-dis/domain"
import { seconds } from "@ens-dis/domain"
import { ne, desc } from "drizzle-orm"
import { governanceProposal } from "ponder:schema"

export class ProposalAdapter implements ProposalRepository {
  constructor(private db: any) {}

  async getRecentProposals(count: number): Promise<Proposal[]> {
    const rows = await this.db
      .select()
      .from(governanceProposal)
      .where(ne(governanceProposal.status, "active"))
      .orderBy(desc(governanceProposal.timestamp))
      .limit(count)

    return rows.map((row: any) => ({
      id: row.id as string,
      status: row.status as string,
      timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
      endBlock: BigInt(row.endBlock as string | number | bigint),
      daoId: "ens",
    }))
  }
}
