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
      delegates: readonly Address[],
      timestamp: Seconds,
    ): Promise<readonly Delegation[]> {
      if (delegates.length === 0) return [];

      const lowerDelegates = delegates.map((d) => d.toLowerCase());

      // Find the latest delegation event per delegator before the timestamp,
      // then filter to those whose toDelegateId is in the target set.
      const latestTs = db
        .select({
          delegatorId: ensDelegationEvent.delegatorId,
          maxTs: sql<bigint>`MAX(${ensDelegationEvent.timestamp})`.as("max_ts"),
        })
        .from(ensDelegationEvent)
        .where(lte(ensDelegationEvent.timestamp, timestamp))
        .groupBy(ensDelegationEvent.delegatorId)
        .as("latest_ts");

      // Fetch all events at the max timestamp per delegator (no delegate filter
      // yet — we must dedup by blockNumber first to avoid keeping a stale
      // same-timestamp event whose toDelegateId happens to match).
      const rows = await db
        .select({
          delegatorId: ensDelegationEvent.delegatorId,
          toDelegateId: ensDelegationEvent.toDelegateId,
          timestamp: ensDelegationEvent.timestamp,
          blockNumber: ensDelegationEvent.blockNumber,
          logIndex: ensDelegationEvent.logIndex,
        })
        .from(ensDelegationEvent)
        .innerJoin(
          latestTs,
          and(
            eq(ensDelegationEvent.delegatorId, latestTs.delegatorId),
            eq(ensDelegationEvent.timestamp, latestTs.maxTs),
          ),
        );

      // Deduplicate same-timestamp ties: keep highest blockNumber/logIndex per delegator.
      const deduped = new Map<string, (typeof rows)[0]>();
      for (const row of rows) {
        const existing = deduped.get(row.delegatorId);
        if (
          !existing ||
          BigInt(row.blockNumber) > BigInt(existing.blockNumber) ||
          (BigInt(row.blockNumber) === BigInt(existing.blockNumber) &&
            row.logIndex > existing.logIndex)
        ) {
          deduped.set(row.delegatorId, row);
        }
      }

      // Now filter to delegators whose latest delegation targets our delegate set.
      const delegateSet = new Set(lowerDelegates);
      return [...deduped.values()]
        .filter((row) => delegateSet.has(row.toDelegateId.toLowerCase()))
        .map((row) => ({
          delegator: row.delegatorId as Address,
          delegate: row.toDelegateId as Address,
          timestamp: seconds(BigInt(row.timestamp)),
          blockNumber: blockNumber(BigInt(row.blockNumber)),
          logIndex: row.logIndex,
        }));
    },
  };
}
