import type { VotingPowerRepository, VotingPowerSnapshot, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import { and, inArray, lte, gte } from "drizzle-orm"
import { ensVotingPowerSnapshot } from "ponder:schema"

type VPSnapshotRow = typeof ensVotingPowerSnapshot.$inferSelect

export class VotingPowerAdapter implements VotingPowerRepository {
  constructor(private db: any) {}

  async getVotingPowerHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<VotingPowerSnapshot[]> {
    if (accountIds.length === 0) return []

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows: VPSnapshotRow[] = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          inArray(ensVotingPowerSnapshot.accountId, normalizedIds),
          gte(ensVotingPowerSnapshot.timestamp, BigInt(from)),
          lte(ensVotingPowerSnapshot.timestamp, BigInt(to)),
        ),
      )

    return rows.map((row) => ({
      accountId: row.accountId.toLowerCase(),
      votingPower: wei(row.votingPower),
      delta: wei(row.delta),
      timestamp: seconds(row.timestamp),
    }))
  }

  async getAggregateVotingPowerAt(
    delegateIds: string[],
    at: Seconds,
  ): Promise<Wei> {
    if (delegateIds.length === 0) return wei(0n)

    const normalizedIds = delegateIds.map(id => id.toLowerCase())

    const rows: VPSnapshotRow[] = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          inArray(ensVotingPowerSnapshot.accountId, normalizedIds),
          lte(ensVotingPowerSnapshot.timestamp, BigInt(at)),
        ),
      )

    // For each delegate, keep the latest snapshot ≤ at
    const latestByDelegate = new Map<string, { votingPower: bigint; timestamp: bigint }>()
    for (const row of rows) {
      const id = row.accountId.toLowerCase()
      const existing = latestByDelegate.get(id)
      if (!existing || row.timestamp > existing.timestamp) {
        latestByDelegate.set(id, { votingPower: row.votingPower, timestamp: row.timestamp })
      }
    }

    let total = 0n
    for (const entry of latestByDelegate.values()) {
      total += entry.votingPower
    }
    return wei(total)
  }

  async getVotingPower(accountIds: string[]): Promise<Map<string, Wei>> {
    if (accountIds.length === 0) return new Map()

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows: VPSnapshotRow[] = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(inArray(ensVotingPowerSnapshot.accountId, normalizedIds))

    // For each account, keep the latest snapshot (no time filter)
    const latestByAccount = new Map<string, { votingPower: bigint; timestamp: bigint }>()
    for (const row of rows) {
      const accountId = row.accountId.toLowerCase()
      const existing = latestByAccount.get(accountId)
      if (!existing || row.timestamp > existing.timestamp) {
        latestByAccount.set(accountId, { votingPower: row.votingPower, timestamp: row.timestamp })
      }
    }

    const result = new Map<string, Wei>()
    for (const [accountId, entry] of latestByAccount) {
      result.set(accountId, wei(entry.votingPower))
    }
    return result
  }
}
