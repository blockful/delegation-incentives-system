import { describe, it, expect, beforeEach } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { BalanceAdapter } from "../BalanceAdapter.js"
import { seconds } from "@ens-dis/domain"

const BALANCE_EVENTS = [
  { id: "e1", accountId: "0xaaa", balance: 1000n, delta: 1000n, deltaMod: 1000n, timestamp: 100n, blockNumber: 10n, transactionHash: "0x1" },
  { id: "e2", accountId: "0xaaa", balance: 1500n, delta: 500n,  deltaMod: 500n,  timestamp: 200n, blockNumber: 20n, transactionHash: "0x2" },
  { id: "e3", accountId: "0xbbb", balance: 2000n, delta: 2000n, deltaMod: 2000n, timestamp: 150n, blockNumber: 15n, transactionHash: "0x3" },
]

const ENS_BALANCES = [
  { id: "0xaaa", balance: 9999n, lastUpdatedBlock: 999n },
  { id: "0xccc", balance: 5000n, lastUpdatedBlock: 500n },
]

describe("BalanceAdapter.getBalanceHistory", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({
      ens_balance_event: BALANCE_EVENTS,
      ens_balance: ENS_BALANCES,
    })
  })

  it("returns events for given accounts in time range", async () => {
    const adapter = new BalanceAdapter(db)
    const results = await adapter.getBalanceHistory(
      ["0xaaa"],
      seconds(100n),
      seconds(200n),
    )
    expect(results).toHaveLength(2)
    for (const r of results) {
      expect(r.accountId).toBe("0xaaa")
    }
  })

  it("excludes events outside time range", async () => {
    const adapter = new BalanceAdapter(db)
    const results = await adapter.getBalanceHistory(
      ["0xaaa"],
      seconds(150n),
      seconds(200n),
    )
    expect(results).toHaveLength(1)
    expect(results[0].balance).toBe(1500n)
  })

  it("returns empty for unknown account", async () => {
    const adapter = new BalanceAdapter(db)
    const results = await adapter.getBalanceHistory(
      ["0xunknown"],
      seconds(0n),
      seconds(9999n),
    )
    expect(results).toHaveLength(0)
  })
})

describe("BalanceAdapter.getBalanceAt", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({
      ens_balance_event: BALANCE_EVENTS,
      ens_balance: ENS_BALANCES,
    })
  })

  it("returns latest balance event at or before timestamp", async () => {
    const adapter = new BalanceAdapter(db)
    const result = await adapter.getBalanceAt("0xaaa", seconds(200n))
    expect(result).toBe(1500n)
  })

  it("returns event exactly at timestamp boundary", async () => {
    const adapter = new BalanceAdapter(db)
    const result = await adapter.getBalanceAt("0xaaa", seconds(100n))
    expect(result).toBe(1000n)
  })

  it("fallbacks to ens_balance table when no events before timestamp", async () => {
    const adapter = new BalanceAdapter(db)
    // 0xaaa has events but at timestamps > 50
    const result = await adapter.getBalanceAt("0xaaa", seconds(50n))
    expect(result).toBe(9999n)
  })

  it("fallbacks to ens_balance for account with no events at all", async () => {
    const adapter = new BalanceAdapter(db)
    const result = await adapter.getBalanceAt("0xccc", seconds(9999n))
    expect(result).toBe(5000n)
  })

  it("returns wei(0n) for completely unknown account", async () => {
    const adapter = new BalanceAdapter(db)
    const result = await adapter.getBalanceAt("0xunknown", seconds(9999n))
    expect(result).toBe(0n)
  })
})
