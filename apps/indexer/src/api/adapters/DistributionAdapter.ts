import type { DistributionRepository, DistributionResult } from "@ens-dis/domain"
import { wei, basisPoints } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

// ─── BigInt JSON serialization ───────────────────────────────────────────────

const BIGINT_PREFIX = "__bigint__:"

function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return BIGINT_PREFIX + value.toString()
  }
  return value
}

function bigintReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length))
  }
  return value
}

export function distributionResultToJson(result: DistributionResult): string {
  return JSON.stringify(result, bigintReplacer)
}

export function distributionResultFromJson(json: string): DistributionResult {
  const raw = JSON.parse(json, bigintReviver)

  // Re-apply branded types (BigInt values are preserved via reviver)
  return {
    month: raw.month,
    directPayouts: raw.directPayouts.map((p: any) => ({
      address: p.address,
      amount: wei(p.amount as bigint),
      role: p.role,
    })),
    lotteryPools: raw.lotteryPools.map((pool: any) => ({
      totalPrize: wei(pool.totalPrize as bigint),
      winner: pool.winner,
      entries: pool.entries.map((e: any) => ({
        address: e.address,
        originalAmount: wei(e.originalAmount as bigint),
        role: e.role,
      })),
    })),
    metadata: {
      totalDistributed: wei(raw.metadata.totalDistributed as bigint),
      poolTier: {
        momGrowthMinBps: basisPoints(raw.metadata.poolTier.momGrowthMinBps as bigint),
        momGrowthMaxBps: basisPoints(raw.metadata.poolTier.momGrowthMaxBps as bigint),
        poolSize: wei(raw.metadata.poolTier.poolSize as bigint),
        delegateCap: wei(raw.metadata.poolTier.delegateCap as bigint),
        delegatorCap: wei(raw.metadata.poolTier.delegatorCap as bigint),
      },
      momGrowthBps: basisPoints(raw.metadata.momGrowthBps as bigint),
      activeDelegateCount: raw.metadata.activeDelegateCount as number,
      eligibleDelegatorCount: raw.metadata.eligibleDelegatorCount as number,
      computedAt: raw.metadata.computedAt as string,
      randaoSeed: raw.metadata.randaoSeed as bigint,
    },
  }
}

// ─── DistributionAdapter ─────────────────────────────────────────────────────

export class DistributionAdapter implements DistributionRepository {
  constructor(private db: PonderDb) {}

  async save(month: string, result: DistributionResult): Promise<void> {
    const resultJson = distributionResultToJson(result)
    const computedAt = BigInt(Math.floor(Date.now() / 1000))

    await this.db
      .insert("distribution_result")
      .values({ month, resultJson, computedAt } as Row)
      .onConflictDoUpdate({ resultJson, computedAt } as Partial<Row>)
  }

  async load(month: string): Promise<DistributionResult | null> {
    const rows = await this.db
      .select()
      .from("distribution_result")
      .where((r: Row) => r["month"] === month)
      .limit(1)

    if (rows.length === 0) return null

    return distributionResultFromJson(rows[0]["resultJson"] as string)
  }

  async list(): Promise<string[]> {
    const rows = await this.db
      .select()
      .from("distribution_result")
      .orderBy({ field: "month", dir: "asc" })

    return rows.map((r: Row) => r["month"] as string)
  }
}
