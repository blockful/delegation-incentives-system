import type { VotingPowerRepository, VotingPowerSnapshot, Wei } from "@ens-dis/domain"
import { wei, seconds, type Seconds } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class VotingPowerAdapter implements VotingPowerRepository {
  constructor(private db: PonderDb) {}

  async getVotingPowerHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<VotingPowerSnapshot[]> {
    const idSet = new Set(accountIds)

    const rows = await this.db
      .select()
      .from("ens_voting_power_snapshot")
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
      votingPower: wei(BigInt(row["votingPower"] as string | number | bigint)),
      delta: wei(BigInt(row["delta"] as string | number | bigint)),
      timestamp: seconds(BigInt(row["timestamp"] as string | number | bigint)),
    }))
  }

  async getAggregateDelegatedPower(
    activeDelegateIds: string[],
    at: Seconds,
  ): Promise<Wei> {
    if (activeDelegateIds.length === 0) return wei(0n)

    const idSet = new Set(activeDelegateIds)
    const atBig = BigInt(at)

    const rows = await this.db
      .select()
      .from("ens_voting_power_snapshot")
      .where((r: Row) => {
        const ts = BigInt(r["timestamp"] as string | number | bigint)
        return idSet.has(r["accountId"] as string) && ts <= atBig
      })

    // For each delegate, keep only the latest snapshot
    const latestByAccount = new Map<string, { votingPower: bigint; timestamp: bigint }>()
    for (const row of rows) {
      const accountId = (row["accountId"] as string).toLowerCase()
      const ts = BigInt(row["timestamp"] as string | number | bigint)
      const vp = BigInt(row["votingPower"] as string | number | bigint)
      const existing = latestByAccount.get(accountId)
      if (!existing || ts > existing.timestamp) {
        latestByAccount.set(accountId, { votingPower: vp, timestamp: ts })
      }
    }

    let total = 0n
    for (const entry of latestByAccount.values()) {
      total += entry.votingPower
    }
    return wei(total)
  }

  async getVotingPower(accountIds: string[]): Promise<Map<string, Wei>> {
    if (accountIds.length === 0) return new Map()

    const idSet = new Set(accountIds)

    const rows = await this.db
      .select()
      .from("ens_voting_power_snapshot")
      .where((r: Row) => idSet.has(r["accountId"] as string))

    // For each account, keep the latest snapshot (no time filter)
    const latestByAccount = new Map<string, { votingPower: bigint; timestamp: bigint }>()
    for (const row of rows) {
      const accountId = (row["accountId"] as string).toLowerCase()
      const ts = BigInt(row["timestamp"] as string | number | bigint)
      const vp = BigInt(row["votingPower"] as string | number | bigint)
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
