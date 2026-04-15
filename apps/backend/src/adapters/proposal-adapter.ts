import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, desc, inArray } from "drizzle-orm";
import { governanceProposal } from "ponder:schema";
import type { ProposalRepository } from "@ens-dis/domain";
import {
  type Proposal,
  type ProposalStatus,
  type Seconds,
  FINALIZED_STATUSES,
  seconds,
  blockNumber,
} from "@ens-dis/domain";

type Db = typeof PonderDb;

const FINALIZED_STATUS_LIST = [...FINALIZED_STATUSES] as string[];

export function createProposalAdapter(db: Db): ProposalRepository {
  return {
    async getFinalizedProposals(
      beforeTimestamp: Seconds,
      limit: number,
    ): Promise<readonly Proposal[]> {
      const rows = await db
        .select()
        .from(governanceProposal)
        .where(
          and(
            inArray(governanceProposal.status, FINALIZED_STATUS_LIST),
            lte(governanceProposal.finalizedTimestamp, beforeTimestamp),
          ),
        )
        .orderBy(desc(governanceProposal.finalizedTimestamp))
        .limit(limit);

      return rows.map((row) => ({
        id: row.id,
        status: row.status as ProposalStatus,
        finalizedTimestamp: seconds(BigInt(row.finalizedTimestamp!)),
        startBlock: blockNumber(BigInt(row.startBlock)),
        endBlock: blockNumber(BigInt(row.endBlock)),
      }));
    },
  };
}
