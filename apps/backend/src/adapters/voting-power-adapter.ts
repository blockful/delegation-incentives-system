import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, gte, asc, desc } from "drizzle-orm";
import { ensVotingPowerSnapshot } from "ponder:schema";
import type { VotingPowerRepository } from "@ens-dis/domain";
import type { Address, Seconds, Wei, VotingPowerEvent } from "@ens-dis/domain";
import { wei, seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createVotingPowerAdapter(db: Db): VotingPowerRepository {
  return {
    async getVpEventsInRange(
      voter: Address,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly VotingPowerEvent[]> {
      const rows = await db
        .select()
        .from(ensVotingPowerSnapshot)
        .where(
          and(
            eq(ensVotingPowerSnapshot.voterId, voter.toLowerCase()),
            gte(ensVotingPowerSnapshot.timestamp, from),
            lte(ensVotingPowerSnapshot.timestamp, to),
          ),
        )
        .orderBy(
          asc(ensVotingPowerSnapshot.timestamp),
          asc(ensVotingPowerSnapshot.blockNumber),
          asc(ensVotingPowerSnapshot.logIndex),
        );

      return rows.map((row) => ({
        voter: row.voterId as Address,
        newBalance: wei(BigInt(row.votingPower)),
        timestamp: seconds(BigInt(row.timestamp)),
        blockNumber: blockNumber(BigInt(row.blockNumber)),
        logIndex: row.logIndex,
      }));
    },

    async getVpAtTimestamp(
      voter: Address,
      timestamp: Seconds,
    ): Promise<Wei> {
      const rows = await db
        .select()
        .from(ensVotingPowerSnapshot)
        .where(
          and(
            eq(ensVotingPowerSnapshot.voterId, voter.toLowerCase()),
            lte(ensVotingPowerSnapshot.timestamp, timestamp),
          ),
        )
        .orderBy(
          desc(ensVotingPowerSnapshot.timestamp),
          desc(ensVotingPowerSnapshot.blockNumber),
          desc(ensVotingPowerSnapshot.logIndex),
        )
        .limit(1);

      if (rows.length === 0) return wei(0n);
      return wei(BigInt(rows[0].votingPower));
    },

    async getAggregateVpAtTimestamp(
      voters: readonly Address[],
      timestamp: Seconds,
    ): Promise<Wei> {
      if (voters.length === 0) return wei(0n);

      // For each voter, get most recent VP at or before timestamp
      let total = 0n;
      for (const voter of voters) {
        const vp = await this.getVpAtTimestamp(voter, timestamp);
        total += vp;
      }
      return wei(total);
    },
  };
}
