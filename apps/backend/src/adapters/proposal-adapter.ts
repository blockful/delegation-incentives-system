import type { db as PonderDb } from "ponder:api";
import { and, ne, desc, sql } from "drizzle-orm";
import { governanceProposal } from "ponder:schema";
import type { ProposalRepository } from "@ens-dis/domain";
import {
  type Proposal,
  type ProposalStatus,
  type BlockNumber,
  blockNumber,
} from "@ens-dis/domain";

type Db = typeof PonderDb;

/**
 * Point-in-time window query — the single source of truth for "the last N
 * finalized proposals", shared by the reward pipeline (via the adapter below)
 * and the public API (api/helpers.ts) so both always see the same window.
 *
 * A proposal is finalized the moment its voting period ends:
 * `endBlock < beforeBlock`. All post-voting statuses (executed/queued/
 * succeeded/defeated/expired) are equally "finalized" — the window is
 * outcome-independent, and sorting by endBlock guarantees that later
 * governance events (queue/execute) can never reorder a proposal or evict it
 * from a historical window. Deliberately NOT keyed on finalizedTimestamp,
 * which the indexer overwrites on each status event.
 *
 * Canceled proposals are excluded: a proposal canceled before its endBlock
 * never completed voting. A cancel *after* queueing exists on-chain, but the
 * indexer overwrites status to 'canceled' regardless of when the cancel
 * happened, so excluding all canceled rows is the conservative, deterministic
 * choice.
 */
export async function selectFinalizedProposalsBefore(
  db: Db,
  beforeBlock: BlockNumber,
  limit: number,
): Promise<Proposal[]> {
  const rows = await db
    .select()
    .from(governanceProposal)
    .where(
      and(
        sql`${governanceProposal.endBlock} < ${beforeBlock}`,
        ne(governanceProposal.status, "canceled"),
      ),
    )
    .orderBy(desc(governanceProposal.endBlock))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    status: row.status as ProposalStatus,
    startBlock: blockNumber(BigInt(row.startBlock)),
    endBlock: blockNumber(BigInt(row.endBlock)),
  }));
}

export function createProposalAdapter(db: Db): ProposalRepository {
  return {
    async getFinalizedProposals(
      beforeBlock: BlockNumber,
      limit: number,
    ): Promise<readonly Proposal[]> {
      return selectFinalizedProposalsBefore(db, beforeBlock, limit);
    },
  };
}
