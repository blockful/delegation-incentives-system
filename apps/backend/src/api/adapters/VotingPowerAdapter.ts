import type { VotingPowerRepository, VotingPowerSnapshot, Wei } from "@ens-dis/domain"
import { wei, seconds, computeTWAP, type Seconds } from "@ens-dis/domain"
import { and, inArray, lte, gte } from "drizzle-orm"
import { ensVotingPowerSnapshot } from "ponder:schema"

export class VotingPowerAdapter implements VotingPowerRepository {
  constructor(private db: any) {}

  async getVotingPowerHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<VotingPowerSnapshot[]> {
    if (accountIds.length === 0) return []

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          inArray(ensVotingPowerSnapshot.accountId, normalizedIds),
          gte(ensVotingPowerSnapshot.timestamp, BigInt(from)),
          lte(ensVotingPowerSnapshot.timestamp, BigInt(to)),
        ),
      )

    return rows.map((row: any) => ({
      accountId: (row.accountId as string).toLowerCase(),
      votingPower: wei(BigInt(row.votingPower as string | number | bigint)),
      delta: wei(BigInt(row.delta as string | number | bigint)),
      timestamp: seconds(BigInt(row.timestamp as string | number | bigint)),
    }))
  }

  async getAggregateDelegatedPower(
    activeDelegateIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<Wei> {
    if (activeDelegateIds.length === 0) return wei(0n)

    const fromBig = BigInt(from)
    const toBig = BigInt(to)
    const window = toBig - fromBig
    if (window === 0n) return wei(0n)

    const normalizedIds = activeDelegateIds.map(id => id.toLowerCase())

    // Fetch all snapshots up to `to` (includes base VP before window start)
    const rows = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          inArray(ensVotingPowerSnapshot.accountId, normalizedIds),
          lte(ensVotingPowerSnapshot.timestamp, toBig),
        ),
      )

    // Group by delegate and sort ascending by timestamp
    const byDelegate = new Map<string, { timestamp: bigint; votingPower: bigint }[]>()
    for (const row of rows) {
      const accountId = (row.accountId as string).toLowerCase()
      const entry = { timestamp: BigInt(row.timestamp), votingPower: BigInt(row.votingPower) }
      const list = byDelegate.get(accountId) ?? []
      list.push(entry)
      byDelegate.set(accountId, list)
    }

    let total = 0n
    for (const id of normalizedIds) {
      const snapshots = (byDelegate.get(id) ?? []).sort((a, b) =>
        a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
      )
      total += computeTWAP(snapshots, fromBig, toBig, window)
    }
    return wei(total)
  }

  async getVotingPower(accountIds: string[]): Promise<Map<string, Wei>> {
    if (accountIds.length === 0) return new Map()

    const normalizedIds = accountIds.map(id => id.toLowerCase())

    const rows = await this.db
      .select()
      .from(ensVotingPowerSnapshot)
      .where(inArray(ensVotingPowerSnapshot.accountId, normalizedIds))

    // For each account, keep the latest snapshot (no time filter)
    const latestByAccount = new Map<string, { votingPower: bigint; timestamp: bigint }>()
    for (const row of rows) {
      const accountId = (row.accountId as string).toLowerCase()
      const ts = BigInt(row.timestamp as string | number | bigint)
      const vp = BigInt(row.votingPower as string | number | bigint)
      const existing = latestByAccount.get(accountId)
      if (!existing || ts > existing.timestamp) {
        latestByAccount.set(accountId, { votingPower: vp, timestamp: ts })
      }
    }

    const result = new Map<string, Wei>()
    for (const [accountId, entry] of latestByAccount) {
      result.set(accountId, wei(entry.votingPower))
    }
    return result
  }
}
