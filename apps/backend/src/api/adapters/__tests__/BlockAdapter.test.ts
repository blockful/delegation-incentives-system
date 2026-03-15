import { describe, it, expect, vi } from "vitest"
import { BlockAdapter } from "../BlockAdapter.js"
import type { PublicClient } from "viem"

function makeMockClient(blocks: Record<string | number, { number: bigint; timestamp: bigint; mixHash: string }>) {
  const blocksByNumber: typeof blocks = blocks

  // Latest block is the one with the highest number
  const latestBlockNumber = Object.values(blocks).reduce(
    (max, b) => (b.number > max ? b.number : max),
    0n,
  )

  return {
    getBlock: vi.fn(async (params: any) => {
      if (params.blockTag === "latest") {
        return blocksByNumber[Number(latestBlockNumber)]
      }
      if (params.blockNumber !== undefined) {
        const b = blocksByNumber[Number(params.blockNumber)]
        if (!b) throw new Error(`Block not found: ${params.blockNumber}`)
        return b
      }
      throw new Error("Unknown getBlock params")
    }),
  } as unknown as PublicClient
}

describe("BlockAdapter.getRandaoForDate", () => {
  it("returns the mixHash as bigint for a day date", async () => {
    // Build a mock client with blocks spanning a known range
    // Target: last block of 2024-01-15 UTC (end timestamp = 2024-01-16T00:00:00 - 1 = 1705363199)
    const targetTs = 1705363199n // 2024-01-15 23:59:59 UTC

    const client = makeMockClient({
      1: { number: 1n, timestamp: 1705340000n, mixHash: "0x0000000000000000000000000000000000000000000000000000000000000001" },
      2: { number: 2n, timestamp: 1705350000n, mixHash: "0x0000000000000000000000000000000000000000000000000000000000000002" },
      3: { number: 3n, timestamp: targetTs,    mixHash: "0x0000000000000000000000000000000000000000000000000000000000000003" },
      4: { number: 4n, timestamp: 1705370000n, mixHash: "0x0000000000000000000000000000000000000000000000000000000000000004" },
    })

    const adapter = new BlockAdapter(client)
    const result = await adapter.getRandaoForDate("2024-01-15")

    // Block 3 is the last block at or before targetTs
    expect(result).toBe(BigInt("0x0000000000000000000000000000000000000000000000000000000000000003"))
  })

  it("handles null block number in latest block (uses 0n as hi fallback)", async () => {
    // Edge case: latestBlock.number is null → hi = 0n → loop doesn't execute → returns lo=1n
    const mixHash = "0x0000000000000000000000000000000000000000000000000000000000000042"
    const client = {
      getBlock: vi.fn(async (params: any) => {
        if (params.blockTag === "latest") {
          return { number: null, timestamp: 1705363199n, mixHash }
        }
        // Block 1 covers the fallback path (lo=1n returned when hi=0n)
        return { number: 1n, timestamp: 1705363199n, mixHash }
      }),
    } as unknown as PublicClient
    const adapter = new BlockAdapter(client)
    const result = await adapter.getRandaoForDate("2024-01-15")
    expect(typeof result).toBe("bigint")
  })

  it("returns the mixHash as bigint for a month date", async () => {
    // Last block of 2024-01 UTC (end = 2024-02-01T00:00:00 - 1 = 1706745599)
    const targetTs = 1706745599n

    const client = makeMockClient({
      1: { number: 1n, timestamp: 1706700000n, mixHash: "0xaabbcc" },
      2: { number: 2n, timestamp: targetTs,    mixHash: "0xdeadbeef" },
      3: { number: 3n, timestamp: 1706800000n, mixHash: "0xffffff" },
    })

    const adapter = new BlockAdapter(client)
    const result = await adapter.getRandaoForDate("2024-01")

    expect(result).toBe(BigInt("0xdeadbeef"))
  })
})
