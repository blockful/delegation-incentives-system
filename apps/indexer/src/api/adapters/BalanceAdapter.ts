import type { BalanceRepository, BalanceEvent, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class BalanceAdapter implements BalanceRepository {
  constructor(private db: PonderDb) {}

  async getBalanceHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<BalanceEvent[]> {
    const idSet = new Set(accountIds)

    const rows = await this.db
      .select()
      .from("ens_balance_event")
      .where((r: Row) => {
        const ts = BigInt(r["timestamp"] as string | number | bigint)
        return (
          idSet.has(r["accountId"] as string) &&
          ts >= BigInt(from) &&
          ts <= BigInt(to)
        )
      })

    return rows.map((row: Row) => ({
      accountId: (row["accountId"] as string).toLowerCase(),
      balance: wei(BigInt(row["balance"] as string | number | bigint)),
      delta: wei(BigInt(row["delta"] as string | number | bigint)),
      timestamp: seconds(BigInt(row["timestamp"] as string | number | bigint)),
    }))
  }

  async getBalanceAt(accountId: string, at: Seconds): Promise<Wei> {
    const atBig = BigInt(at)
    const normalizedId = accountId.toLowerCase()

    // Try ens_balance_event first: latest event at or before `at`
    const eventRows = await this.db
      .select()
      .from("ens_balance_event")
      .where((r: Row) => {
        const ts = BigInt(r["timestamp"] as string | number | bigint)
        return (r["accountId"] as string).toLowerCase() === normalizedId && ts <= atBig
      })
      .orderBy({ field: "timestamp", dir: "desc" })
      .limit(1)

    if (eventRows.length > 0) {
      return wei(BigInt(eventRows[0]["balance"] as string | number | bigint))
    }

    // Fallback: current balance from ens_balance table
    const balanceRows = await this.db
      .select()
      .from("ens_balance")
      .where((r: Row) => (r["id"] as string).toLowerCase() === normalizedId)
      .limit(1)

    if (balanceRows.length > 0) {
      return wei(BigInt(balanceRows[0]["balance"] as string | number | bigint))
    }

    return wei(0n)
  }
}
