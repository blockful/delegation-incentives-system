import type { VotingPowerRepository, VotingPowerSnapshot, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import { and, inArray, lte, gte } from "drizzle-orm"
import { ensVotingPowerSnapshot } from "ponder:schema"

type VPSnapshotRow = typeof ensVotingPowerSnapshot.$inferSelect

/** Keep the latest row per accountId. Input may be in any order. */
function keepLatest(rows: VPSnapshotRow[]): Map<string, VPSnapshotRow> {
  const result = new Map<string, VPSnapshotRow>()
  for (const row of rows) {
    const id = row.accountId.toLowerCase()
    const existing = result.get(id)
    if (!existing || row.timestamp > existing.timestamp) result.set(id, row)
  }
  return result
}

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

    let total = 0n
    for (const row of keepLatest(rows).values()) total += row.votingPower
    return wei(total)
  }

  async getVotingPower(accountIds: string[]): Promise<Map<string, Wei>> {
    if (accountIds.length === 0) return new Map()

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows: VPSnapshotRow[] = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(inArray(ensVotingPowerSnapshot.accountId, normalizedIds))

    const result = new Map<string, Wei>()
    for (const [id, row] of keepLatest(rows)) result.set(id, wei(row.votingPower))
    return result
  }
}
