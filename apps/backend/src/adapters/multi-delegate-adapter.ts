import type { db as PonderDb } from "ponder:api";
import { eq, and, lte, gte, inArray, asc, or } from "drizzle-orm";
import { multiDelegateTransfer } from "ponder:schema";
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
      timestamp: Seconds,
    ): Promise<readonly MultiDelegatePosition[]> {
      if (delegates.length === 0) return [];

      const lowerDelegates = delegates.map((d) => d.toLowerCase());

      // Reconstruct historical positions from transfer events up to timestamp.
      const rows = await db
        .select()
        .from(multiDelegateTransfer)
        .where(
          and(
            inArray(multiDelegateTransfer.delegate, lowerDelegates),
            lte(multiDelegateTransfer.timestamp, timestamp),
          ),
        );

      // Aggregate balances per (owner, delegate) pair.
      const balances = new Map<string, { owner: string; delegate: string; balance: bigint; maxBlock: bigint; maxLogIndex: number }>();

      for (const row of rows) {
        const fromAddr = row.from.toLowerCase();
        const toAddr = row.to.toLowerCase();
        const amount = BigInt(row.amount);
        const block = BigInt(row.blockNumber);
        const logIndex = row.logIndex;

        // Credit the receiver (skip zero address — mints have from=zero)
        if (toAddr !== ZERO_ADDRESS) {
          const key = `${toAddr}-${row.delegate}`;
          const existing = balances.get(key);
          if (existing) {
            existing.balance += amount;
            if (
              block > existing.maxBlock ||
              (block === existing.maxBlock && logIndex > existing.maxLogIndex)
            ) {
              existing.maxBlock = block;
              existing.maxLogIndex = logIndex;
            }
          } else {
            balances.set(key, { owner: toAddr, delegate: row.delegate, balance: amount, maxBlock: block, maxLogIndex: logIndex });
          }
        }

        // Debit the sender (skip zero address — burns have to=zero)
        if (fromAddr !== ZERO_ADDRESS) {
          const key = `${fromAddr}-${row.delegate}`;
          const existing = balances.get(key);
          if (existing) {
            existing.balance -= amount;
            if (
              block > existing.maxBlock ||
              (block === existing.maxBlock && logIndex > existing.maxLogIndex)
            ) {
              existing.maxBlock = block;
              existing.maxLogIndex = logIndex;
            }
          } else {
            balances.set(key, { owner: fromAddr, delegate: row.delegate, balance: -amount, maxBlock: block, maxLogIndex: logIndex });
          }
        }
      }

      const results: MultiDelegatePosition[] = [];
      for (const entry of balances.values()) {
        if (entry.balance > 0n) {
          results.push({
            holder: entry.owner as Address,
            delegate: entry.delegate as Address,
            balance: wei(entry.balance),
            timestamp: seconds(0n),
            blockNumber: blockNumber(entry.maxBlock),
            logIndex: entry.maxLogIndex,
          });
        }
      }
      return results;
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
        .orderBy(
          asc(multiDelegateTransfer.timestamp),
          asc(multiDelegateTransfer.blockNumber),
          asc(multiDelegateTransfer.logIndex),
        );

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
          logIndex: row.logIndex,
        };
      });
    },

    async getErc1155BalanceAtTimestamp(
      holder: Address,
      delegate: Address,
      timestamp: Seconds,
    ): Promise<Wei> {
      // Reconstruct historical balance from transfer events up to timestamp.
      const lowerHolder = holder.toLowerCase();
      const lowerDelegate = delegate.toLowerCase();

      const rows = await db
        .select()
        .from(multiDelegateTransfer)
        .where(
          and(
            eq(multiDelegateTransfer.delegate, lowerDelegate),
            lte(multiDelegateTransfer.timestamp, timestamp),
            or(
              eq(multiDelegateTransfer.from, lowerHolder),
              eq(multiDelegateTransfer.to, lowerHolder),
            ),
          ),
        );

      let balance = 0n;
      for (const row of rows) {
        const amount = BigInt(row.amount);
        if (row.to.toLowerCase() === lowerHolder) balance += amount;
        if (row.from.toLowerCase() === lowerHolder) balance -= amount;
      }

      return wei(balance < 0n ? 0n : balance);
    },
  };
}
