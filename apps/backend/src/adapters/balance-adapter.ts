import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, gte, asc, desc } from "drizzle-orm";
import { ensBalanceEvent } from "ponder:schema";
import type { BalanceRepository } from "@ens-dis/domain";
import type { Address, Seconds, Wei, BalanceEvent } from "@ens-dis/domain";
import { wei, seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createBalanceAdapter(db: Db): BalanceRepository {
  return {
    async getBalanceEventsInRange(
      account: Address,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly BalanceEvent[]> {
      const rows = await db
        .select()
        .from(ensBalanceEvent)
        .where(
          and(
            eq(ensBalanceEvent.accountId, account.toLowerCase()),
            gte(ensBalanceEvent.timestamp, from),
            lte(ensBalanceEvent.timestamp, to),
          ),
        )
        .orderBy(
          asc(ensBalanceEvent.timestamp),
          asc(ensBalanceEvent.blockNumber),
          asc(ensBalanceEvent.logIndex),
        );

      return rows.map((row) => ({
        account: row.accountId as Address,
        balance: wei(BigInt(row.balance)),
        delta: wei(BigInt(row.delta)),
        timestamp: seconds(BigInt(row.timestamp)),
        blockNumber: blockNumber(BigInt(row.blockNumber)),
        logIndex: row.logIndex,
      }));
    },

    async getBalanceAtTimestamp(
      account: Address,
      timestamp: Seconds,
    ): Promise<Wei> {
      const rows = await db
        .select()
        .from(ensBalanceEvent)
        .where(
          and(
            eq(ensBalanceEvent.accountId, account.toLowerCase()),
            lte(ensBalanceEvent.timestamp, timestamp),
          ),
        )
        .orderBy(
          desc(ensBalanceEvent.timestamp),
          desc(ensBalanceEvent.blockNumber),
          desc(ensBalanceEvent.logIndex),
        )
        .limit(1);

      if (rows.length === 0) return wei(0n);
      return wei(BigInt(rows[0].balance));
    },
  };
}
