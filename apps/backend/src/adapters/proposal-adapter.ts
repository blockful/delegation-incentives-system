import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, desc, inArray, or, sql } from "drizzle-orm";
import { governanceProposal } from "ponder:schema";
import type { ProposalRepository } from "@ens-dis/domain";
import {
  type Proposal,
  type ProposalStatus,
  type Seconds,
  type BlockNumber,
  FINALIZED_STATUSES,
  seconds,
  blockNumber,
} from "@ens-dis/domain";

type Db = typeof PonderDb;

const FINALIZED_STATUS_LIST = [...FINALIZED_STATUSES];

export function createProposalAdapter(db: Db): ProposalRepository {
  return {
    async getFinalizedProposals(
      beforeTimestamp: Seconds,
      limit: number,
      beforeBlock?: BlockNumber,
    ): Promise<readonly Proposal[]> {
      // Query 1: explicitly finalized proposals (executed, canceled, queued, etc.)
      const explicitRows = await db
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

      const explicit: Proposal[] = explicitRows.map((row) => ({
        id: row.id,
        status: row.status as ProposalStatus,
        finalizedTimestamp: seconds(BigInt(row.finalizedTimestamp!)),
        startBlock: blockNumber(BigInt(row.startBlock)),
        endBlock: blockNumber(BigInt(row.endBlock)),
      }));

      // Query 2: implicitly defeated proposals — still "active" but voting
      // period (endBlock) has passed. The OZ Governor has no ProposalDefeated
      // event; defeat is inferred from state.
      if (beforeBlock !== undefined) {
        const implicitRows = await db
          .select()
          .from(governanceProposal)
          .where(
            and(
              eq(governanceProposal.status, "active"),
              sql`${governanceProposal.endBlock} < ${beforeBlock}`,
            ),
          );

        for (const row of implicitRows) {
          explicit.push({
            id: row.id,
            status: "defeated" as ProposalStatus,
            // Use the proposal's own timestamp as an approximation
            finalizedTimestamp: seconds(BigInt(row.timestamp)),
            startBlock: blockNumber(BigInt(row.startBlock)),
            endBlock: blockNumber(BigInt(row.endBlock)),
          });
        }
      }

      // Re-sort combined results by finalizedTimestamp desc and take top N
      return explicit
        .sort((a, b) => (a.finalizedTimestamp > b.finalizedTimestamp ? -1 : 1))
        .slice(0, limit);
    },
  };
}
