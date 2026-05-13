import type { db as PonderDb } from "ponder:api";
import { and, eq, lte, sql } from "drizzle-orm";
import { ensDelegationEvent } from "ponder:schema";
import type { DelegationRepository } from "@ens-dis/domain";
import type { Address, Seconds, Delegation } from "@ens-dis/domain";
import { seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createDelegationAdapter(db: Db): DelegationRepository {
  return {
    async getDelegationsToAtTimestamp(
      voters: readonly Address[],
      timestamp: Seconds,
    ): Promise<readonly Delegation[]> {
      if (voters.length === 0) return [];

      const lowerVoters = voters.map((d) => d.toLowerCase());

      // Find the latest delegation event per token holder before the timestamp,
      // then filter to those whose toVoterId is in the target set.
      const latestTs = db
        .select({
          tokenHolderId: ensDelegationEvent.tokenHolderId,
          maxTs: sql<bigint>`MAX(${ensDelegationEvent.timestamp})`.as("max_ts"),
        })
        .from(ensDelegationEvent)
        .where(lte(ensDelegationEvent.timestamp, timestamp))
        .groupBy(ensDelegationEvent.tokenHolderId)
        .as("latest_ts");

      // Fetch all events at the max timestamp per token holder (no voter filter
      // yet — we must dedup by blockNumber first to avoid keeping a stale
      // same-timestamp event whose toVoterId happens to match).
      const rows = await db
        .select({
          tokenHolderId: ensDelegationEvent.tokenHolderId,
          toVoterId: ensDelegationEvent.toVoterId,
          timestamp: ensDelegationEvent.timestamp,
          blockNumber: ensDelegationEvent.blockNumber,
          logIndex: ensDelegationEvent.logIndex,
        })
        .from(ensDelegationEvent)
        .innerJoin(
          latestTs,
          and(
            eq(ensDelegationEvent.tokenHolderId, latestTs.tokenHolderId),
            eq(ensDelegationEvent.timestamp, latestTs.maxTs),
          ),
        );

      // Deduplicate same-timestamp ties: keep highest blockNumber/logIndex per token holder.
      const deduped = new Map<string, (typeof rows)[0]>();
      for (const row of rows) {
        const existing = deduped.get(row.tokenHolderId);
        if (
          !existing ||
          BigInt(row.blockNumber) > BigInt(existing.blockNumber) ||
          (BigInt(row.blockNumber) === BigInt(existing.blockNumber) &&
            row.logIndex > existing.logIndex)
        ) {
          deduped.set(row.tokenHolderId, row);
        }
      }

      // Now filter to token holders whose latest delegation targets our voter set.
      const voterSet = new Set(lowerVoters);
      return [...deduped.values()]
        .filter((row) => voterSet.has(row.toVoterId.toLowerCase()))
        .map((row) => ({
          tokenHolder: row.tokenHolderId as Address,
          voter: row.toVoterId as Address,
          timestamp: seconds(BigInt(row.timestamp)),
          blockNumber: blockNumber(BigInt(row.blockNumber)),
          logIndex: row.logIndex,
        }));
    },
  };
}
