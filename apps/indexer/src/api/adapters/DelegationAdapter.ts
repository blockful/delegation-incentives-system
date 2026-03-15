import type { DelegationRepository, Delegation, AccountBalance } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import { lte } from "drizzle-orm"
import { ensDelegationEvent, ensDelegation, ensBalance } from "ponder:schema"

export class DelegationAdapter implements DelegationRepository {
  constructor(private db: any) {}

  async getActiveDelegations(
    delegateIds: string[],
    at: Seconds,
  ): Promise<Delegation[]> {
    if (delegateIds.length === 0) return []

    const idSet = new Set(delegateIds.map((id) => id.toLowerCase()))
    const atBig = BigInt(at)

    // Get all delegation events at or before `at`
    const rows = await this.db
      .select()
      .from(ensDelegationEvent)
      .where(lte(ensDelegationEvent.timestamp, atBig))

    // For each delegator, keep only the latest event
    const latestByDelegator = new Map<string, any>()
    for (const row of rows) {
      const delegatorId = (row.delegatorId as string).toLowerCase()
      const ts = BigInt(row.timestamp as string | number | bigint)
      const existing = latestByDelegator.get(delegatorId)
      const existingTs = existing
        ? BigInt(existing.timestamp as string | number | bigint)
        : -1n
      if (ts > existingTs) {
        latestByDelegator.set(delegatorId, row)
      }
    }

    // Keep only those whose latest toDelegate is in delegateIds
    const result: Delegation[] = []
    for (const [delegatorId, row] of latestByDelegator) {
      const toDelegateId = (row.toDelegateId as string).toLowerCase()
      if (idSet.has(toDelegateId)) {
        result.push({
          delegatorId,
          delegateId: toDelegateId,
          delegatedValue: wei(BigInt(row.delegatedValue as string | number | bigint)),
          timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
        })
      }
    }

    return result
  }

  async getAccountBalances(): Promise<AccountBalance[]> {
    // JOIN ens_delegation (current) with ens_balance (current)
    const delegationRows = await this.db
      .select()
      .from(ensDelegation)

    const balanceRows = await this.db
      .select()
      .from(ensBalance)

    const balanceMap = new Map<string, bigint>()
    for (const row of balanceRows) {
      const id = (row.id as string).toLowerCase()
      balanceMap.set(id, BigInt(row.balance as string | number | bigint))
    }

    const result: AccountBalance[] = []
    for (const row of delegationRows) {
      const accountId = (row.id as string).toLowerCase()
      const delegateId = (row.delegateId as string).toLowerCase()
      const balance = balanceMap.get(accountId) ?? 0n
      result.push({
        accountId,
        balance: wei(balance),
        delegate: delegateId,
      })
    }

    return result
  }
}
