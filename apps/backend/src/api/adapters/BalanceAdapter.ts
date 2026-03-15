import type { BalanceRepository, BalanceEvent, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import { and, inArray, lte, gte, eq, desc } from "drizzle-orm"
import { ensBalanceEvent } from "ponder:schema"

export class BalanceAdapter implements BalanceRepository {
  constructor(private db: any) {}

  async getBalanceHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<BalanceEvent[]> {
    if (accountIds.length === 0) return []

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows = await this.db
      .select()
      .from(ensBalanceEvent)
      .where(
        and(
          inArray(ensBalanceEvent.accountId, normalizedIds),
          gte(ensBalanceEvent.timestamp, BigInt(from)),
          lte(ensBalanceEvent.timestamp, BigInt(to)),
        ),
      )

    return rows.map((row: any) => ({
      accountId: (row.accountId as string).toLowerCase(),
      balance: wei(BigInt(row.balance as string | number | bigint)),
      delta: wei(BigInt(row.delta as string | number | bigint)),
      timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
    }))
  }

  async getBalanceAt(accountId: string, at: Seconds): Promise<Wei> {
    const normalizedId = accountId.toLowerCase()

    // Try ens_balance_event first: latest event at or before `at`
    const eventRows = await this.db
      .select()
      .from(ensBalanceEvent)
      .where(
        and(
          eq(ensBalanceEvent.accountId, normalizedId),
          lte(ensBalanceEvent.timestamp, BigInt(at)),
        ),
      )
      .orderBy(desc(ensBalanceEvent.timestamp))
      .limit(1)

    if (eventRows.length > 0) {
      return wei(BigInt(eventRows[0].balance as string | number | bigint))
    }

    // No event at or before `at` means the account had no balance yet — return 0.
    // Do NOT fall back to the current ens_balance table: that reflects present state,
    // not the historical state at `at`, which would inflate TWB for accounts that
    // acquired tokens after the query timestamp.
    return wei(0n)
  }
}
