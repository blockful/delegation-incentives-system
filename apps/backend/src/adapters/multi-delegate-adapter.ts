import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, gte, inArray, asc, desc, or } from "drizzle-orm";
import { multiDelegatePosition, multiDelegateTransfer } from "ponder:schema";
import type { MultiDelegateRepository } from "@ens-dis/domain";
import type {
  Address,
  Seconds,
  Wei,
  MultiDelegatePosition,
  Erc1155BalanceEvent,
} from "@ens-dis/domain";
import { wei, seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function createMultiDelegateAdapter(db: Db): MultiDelegateRepository {
  return {
    async getPositionsAtTimestamp(
      delegates: readonly Address[],
      _timestamp: Seconds,
    ): Promise<readonly MultiDelegatePosition[]> {
      if (delegates.length === 0) return [];

      // multiDelegatePosition reflects current indexed state.
      // Only return positions with amount > 0.
      const lowerDelegates = delegates.map((d) => d.toLowerCase());

      const rows = await db
        .select()
        .from(multiDelegatePosition)
        .where(inArray(multiDelegatePosition.delegate, lowerDelegates));

      return rows
        .filter((row) => BigInt(row.amount) > 0n)
        .map((row) => ({
          holder: row.owner as Address,
          delegate: row.delegate as Address,
          balance: wei(BigInt(row.amount)),
          timestamp: seconds(0n),
          blockNumber: blockNumber(BigInt(row.lastUpdatedBlock)),
        }));
    },

    async getErc1155BalanceEventsInRange(
      holder: Address,
      delegate: Address,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly Erc1155BalanceEvent[]> {
      const lowerHolder = holder.toLowerCase();
      const lowerDelegate = delegate.toLowerCase();

      // Get all transfers involving this holder+delegate pair in the time range.
      // Transfers where holder is `to` (incoming) or `from` (outgoing).
      const rows = await db
        .select()
        .from(multiDelegateTransfer)
        .where(
          and(
            eq(multiDelegateTransfer.delegate, lowerDelegate),
            gte(multiDelegateTransfer.timestamp, from),
            lte(multiDelegateTransfer.timestamp, to),
            or(
              eq(multiDelegateTransfer.from, lowerHolder),
              eq(multiDelegateTransfer.to, lowerHolder),
            ),
          ),
        )
        .orderBy(asc(multiDelegateTransfer.timestamp));

      // Get the balance just before the range to compute running totals
      const priorBalance = await this.getErc1155BalanceAtTimestamp(
        holder,
        delegate,
        seconds(from - 1n),
      );

      // Build balance events from the transfer history
      let runningBalance = priorBalance;
      return rows.map((row) => {
        const fromAddr = row.from.toLowerCase();
        const toAddr = row.to.toLowerCase();
        const amount = BigInt(row.amount);

        let delta = 0n;
        if (toAddr === lowerHolder && fromAddr !== lowerHolder) {
          delta = amount;
        } else if (fromAddr === lowerHolder && toAddr !== lowerHolder) {
          delta = -amount;
        }
        // Self-transfers: delta stays 0

        runningBalance = wei(runningBalance + delta);

        return {
          holder: holder,
          delegate: delegate,
          balance: runningBalance,
          delta: wei(delta),
          timestamp: seconds(BigInt(row.timestamp)),
          blockNumber: blockNumber(BigInt(row.blockNumber)),
        };
      });
    },

    async getErc1155BalanceAtTimestamp(
      holder: Address,
      delegate: Address,
      _timestamp: Seconds,
    ): Promise<Wei> {
      // Current position from the multiDelegatePosition table
      const lowerHolder = holder.toLowerCase();
      const lowerDelegate = delegate.toLowerCase();
      const posId = `${lowerHolder}-${lowerDelegate}`;

      const rows = await db
        .select()
        .from(multiDelegatePosition)
        .where(eq(multiDelegatePosition.id, posId))
        .limit(1);

      if (rows.length === 0) return wei(0n);
      return wei(BigInt(rows[0].amount));
    },
  };
}
