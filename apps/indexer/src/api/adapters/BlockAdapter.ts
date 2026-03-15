import type { BlockRepository } from "@ens-dis/domain"
import type { PublicClient } from "viem"

export class BlockAdapter implements BlockRepository {
  constructor(private client: PublicClient) {}

  /**
   * Get the RANDAO value (mixHash) from the last block of a given UTC date.
   * Date can be "YYYY-MM" (last block of that month) or "YYYY-MM-DD" (last block of that day).
   */
  async getRandaoForDate(date: string): Promise<bigint> {
    const endTimestamp = this._dateToEndOfDayTimestamp(date)

    // Binary search for the last block at or before endTimestamp
    const blockNumber = await this._findLastBlockAtOrBefore(endTimestamp)

    const block = await this.client.getBlock({ blockNumber })
    // mixHash contains the RANDAO reveal for post-merge blocks
    return BigInt(block.mixHash)
  }

  private _dateToEndOfDayTimestamp(date: string): bigint {
    const parts = date.split("-")
    let endDate: Date

    if (parts.length === 2) {
      // "YYYY-MM" → last moment of that month
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      // First day of NEXT month, then subtract 1ms to get end of this month
      endDate = new Date(Date.UTC(year, month, 1))
    } else {
      // "YYYY-MM-DD" → last moment of that day
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1 // 0-indexed
      const day = parseInt(parts[2], 10)
      endDate = new Date(Date.UTC(year, month, day + 1))
    }

    // endDate is start of the NEXT period → subtract 1 second
    return BigInt(Math.floor(endDate.getTime() / 1000) - 1)
  }

  private async _findLastBlockAtOrBefore(targetTimestamp: bigint): Promise<bigint> {
    // Get current latest block as upper bound
    const latestBlock = await this.client.getBlock({ blockTag: "latest" })

    let lo = 1n
    let hi = latestBlock.number ?? 0n

    while (lo < hi) {
      const mid = (lo + hi + 1n) / 2n
      const block = await this.client.getBlock({ blockNumber: mid })
      if (block.timestamp <= targetTimestamp) {
        lo = mid
      } else {
        hi = mid - 1n
      }
    }

    return lo
  }
}
