import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, gte, asc, desc, inArray } from "drizzle-orm";
import { ensVotingPowerSnapshot } from "ponder:schema";
import type { VotingPowerRepository } from "@ens-dis/domain";
import type { Address, Seconds, Wei, VotingPowerEvent } from "@ens-dis/domain";
import { wei, seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createVotingPowerAdapter(db: Db): VotingPowerRepository {
  return {
    async getVpEventsInRange(
      delegate: Address,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly VotingPowerEvent[]> {
      const rows = await db
        .select()
        .from(ensVotingPowerSnapshot)
        .where(
          and(
            eq(ensVotingPowerSnapshot.accountId, delegate.toLowerCase()),
            gte(ensVotingPowerSnapshot.timestamp, from),
            lte(ensVotingPowerSnapshot.timestamp, to),
          ),
        )
        .orderBy(asc(ensVotingPowerSnapshot.timestamp));

      return rows.map((row) => ({
        delegate: row.accountId as Address,
        newBalance: wei(BigInt(row.votingPower)),
        timestamp: seconds(BigInt(row.timestamp)),
        blockNumber: blockNumber(BigInt(row.blockNumber)),
      }));
    },

    async getVpAtTimestamp(
      delegate: Address,
      timestamp: Seconds,
    ): Promise<Wei> {
      const rows = await db
        .select()
        .from(ensVotingPowerSnapshot)
        .where(
          and(
            eq(ensVotingPowerSnapshot.accountId, delegate.toLowerCase()),
            lte(ensVotingPowerSnapshot.timestamp, timestamp),
          ),
        )
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      if (rows.length === 0) return wei(0n);
      return wei(BigInt(rows[0].votingPower));
    },

    async getAggregateVpAtTimestamp(
      delegates: readonly Address[],
      timestamp: Seconds,
    ): Promise<Wei> {
      if (delegates.length === 0) return wei(0n);

      // For each delegate, get most recent VP at or before timestamp
      let total = 0n;
      for (const delegate of delegates) {
        const vp = await this.getVpAtTimestamp(delegate, timestamp);
        total += vp;
      }
      return wei(total);
    },
  };
}
