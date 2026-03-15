import type { BalanceRepository, BalanceEvent, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import { and, inArray, lte, gte, eq, desc } from "drizzle-orm"
import { ensBalanceEvent, ensBalance } from "ponder:schema"

export class BalanceAdapter implements BalanceRepository {
  constructor(private db: any) {}

  async getBalanceHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<BalanceEvent[]> {
    if (accountIds.length === 0) return []

    const rows = await this.db
      .select()
      .from(ensBalanceEvent)
      .where(
        and(
          inArray(ensBalanceEvent.accountId, accountIds),
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

    // Fallback: current balance from ens_balance table
    const balanceRows = await this.db
      .select()
      .from(ensBalance)
      .where(eq(ensBalance.id, normalizedId))
      .limit(1)

    if (balanceRows.length > 0) {
      return wei(BigInt(balanceRows[0].balance as string | number | bigint))
    }

    return wei(0n)
  }
}
