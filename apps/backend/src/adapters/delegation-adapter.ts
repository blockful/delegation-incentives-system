import type { db as PonderDb } from "ponder:api";
import { inArray } from "drizzle-orm";
import { ensDelegation } from "ponder:schema";
import type { DelegationRepository } from "@ens-dis/domain";
import type { Address, Seconds, Delegation } from "@ens-dis/domain";
import { seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createDelegationAdapter(db: Db): DelegationRepository {
  return {
    async getDelegationsToAtTimestamp(
      delegates: readonly Address[],
      _timestamp: Seconds,
    ): Promise<readonly Delegation[]> {
      if (delegates.length === 0) return [];

      // The ensDelegation table reflects the current indexed chain state.
      // The timestamp parameter exists for interface consistency but Ponder
      // tables always reflect the latest indexed block.
      const lowerDelegates = delegates.map((d) => d.toLowerCase());

      const rows = await db
        .select()
        .from(ensDelegation)
        .where(inArray(ensDelegation.delegateId, lowerDelegates));

      return rows.map((row) => ({
        delegator: row.id as Address,
        delegate: row.delegateId as Address,
        // Current state — use 0n as sentinel for "latest indexed"
        timestamp: seconds(0n),
        blockNumber: blockNumber(BigInt(row.lastUpdatedBlock)),
      }));
    },
  };
}
