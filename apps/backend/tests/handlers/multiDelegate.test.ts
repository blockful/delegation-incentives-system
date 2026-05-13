import { describe, it, expect, beforeEach } from "vitest"
import {
  processMultiDelegateTransfer,
  handleProxyDeployed,
  handleTransferSingle,
  handleTransferBatch,
} from "../../src/handlers/multiDelegate.js"
import { zeroAddress } from "viem"

const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
// tokenId 1 → delegate address "0x0000000000000000000000000000000000000001"
const TOKEN_ID_1 = 1n
const DELEGATE_1 = "0x0000000000000000000000000000000000000001"

// ─── Fake DB ──────────────────────────────────────────────────────────────────

function resolveTableName(table: unknown): string {
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

function makeFakeDb() {
  const stores = new Map([
    ["multi_delegate_transfer", new Map<string, any>()],
    ["multi_delegate_position", new Map<string, any>()],
    ["protocol_mapping", new Map<string, any>()],
    ["multi_delegate_proxy", new Map<string, any>()],
  ])

  function store(table: unknown) {
    const name = resolveTableName(table)
    const s = stores.get(name)
    if (!s) throw new Error(`Unknown table: ${name}`)
    return s
  }

  const db = {
    find: async (table: unknown, where: { id: any }) => {
      return store(table).get(String(where.id)) ?? null
    },
    insert: (table: unknown) => ({
      values: (row: any) => {
        const obj = {
          onConflictDoUpdate: async (fn: ((existing: any) => any) | Record<string, any>) => {
            const s = store(table)
            const key = String(row.id)
            const existing = s.get(key)
            if (existing) {
              const updates = typeof fn === "function" ? fn(existing) : fn
              s.set(key, { ...existing, ...updates })
            } else {
              s.set(key, { ...row })
            }
          },
          onConflictDoNothing: async () => {
            const s = store(table)
            const key = String(row.id)
            if (!s.has(key)) s.set(key, { ...row })
          },
          then: (
            resolve: (v: any) => any,
            reject?: (e: any) => any,
          ) => {
            try {
              store(table).set(String(row.id), { ...row })
              return Promise.resolve(row).then(resolve, reject)
            } catch (e) {
              return Promise.reject(e).then(resolve, reject)
            }
          },
        }
        return obj
      },
    }),
    update: (table: unknown, where: { id: any }) => ({
      set: async (data: any) => {
        const s = store(table)
        const key = String(where.id)
        const existing = s.get(key)
        if (existing) s.set(key, { ...existing, ...data })
      },
    }),
    delete: async (table: unknown, where: { id: any }) => {
      store(table).delete(String(where.id))
    },
  }

  return { stores, db }
}

function makeContext(db: any) {
  return { db } as any
}

const BASE_PARAMS = {
  transferId: "tx-1",
  from: zeroAddress,
  to: ALICE,
  tokenId: TOKEN_ID_1,
  value: 100n,
  blockNumber: 1000n,
  logIndex: 0,
  timestamp: 1n,
  transactionHash: "0xabc",
}

// ─── processMultiDelegateTransfer ─────────────────────────────────────────────

describe("processMultiDelegateTransfer", () => {
  it("always inserts a transfer record", async () => {
    const fakeDb = makeFakeDb()
    await processMultiDelegateTransfer({ db: fakeDb.db as any, ...BASE_PARAMS })
    expect(fakeDb.stores.get("multi_delegate_transfer")!.has("tx-1")).toBe(true)
  })

  it("transfer record contains expected fields", async () => {
    const fakeDb = makeFakeDb()
    await processMultiDelegateTransfer({ db: fakeDb.db as any, ...BASE_PARAMS })
    const record = fakeDb.stores.get("multi_delegate_transfer")!.get("tx-1")
    expect(record.voter).toBe(DELEGATE_1)
    expect(record.amount).toBe(100n)
    expect(record.blockNumber).toBe(1000n)
  })

  it("mint: creates position for 'to', skips 'from' (zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: zeroAddress,
      to: ALICE,
    })
    const pos = fakeDb.stores.get("multi_delegate_position")!
    expect(pos.has(`${ALICE}-${DELEGATE_1}`)).toBe(true)
    expect(pos.get(`${ALICE}-${DELEGATE_1}`).amount).toBe(100n)
    // zeroAddress should not get a position
    expect(pos.has(`${zeroAddress.toLowerCase()}-${DELEGATE_1}`)).toBe(false)
  })

  it("burn: decrements 'from' position, does not create 'to' position (zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores
      .get("multi_delegate_position")!
      .set(`${ALICE}-${DELEGATE_1}`, { id: `${ALICE}-${DELEGATE_1}`, amount: 200n })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: ALICE,
      to: zeroAddress,
      value: 100n,
    })
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${ALICE}-${DELEGATE_1}`).amount,
    ).toBe(100n)
    expect(
      fakeDb.stores.get("multi_delegate_position")!.has(`${zeroAddress.toLowerCase()}-${DELEGATE_1}`),
    ).toBe(false)
  })

  it("deletes position and stale mapping when amount reaches 0", async () => {
    const fakeDb = makeFakeDb()
    const posId = `${ALICE}-${DELEGATE_1}`
    fakeDb.stores.get("multi_delegate_position")!.set(posId, { id: posId, amount: 100n })
    fakeDb.stores
      .get("protocol_mapping")!
      .set(`multi_delegate-${posId}`, { id: `multi_delegate-${posId}` })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: ALICE,
      to: zeroAddress,
      value: 100n,
    })
    expect(fakeDb.stores.get("multi_delegate_position")!.has(posId)).toBe(false)
    expect(fakeDb.stores.get("protocol_mapping")!.has(`multi_delegate-${posId}`)).toBe(false)
  })

  it("keeps position when amount > 0 after burn", async () => {
    const fakeDb = makeFakeDb()
    const posId = `${ALICE}-${DELEGATE_1}`
    fakeDb.stores.get("multi_delegate_position")!.set(posId, { id: posId, amount: 200n })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: ALICE,
      to: zeroAddress,
      value: 50n,
    })
    expect(fakeDb.stores.get("multi_delegate_position")!.has(posId)).toBe(true)
    expect(fakeDb.stores.get("multi_delegate_position")!.get(posId).amount).toBe(150n)
  })

  it("normal transfer: decrements from, increments to", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores
      .get("multi_delegate_position")!
      .set(`${ALICE}-${DELEGATE_1}`, { id: `${ALICE}-${DELEGATE_1}`, amount: 200n })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: ALICE,
      to: BOB,
      value: 100n,
    })
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${ALICE}-${DELEGATE_1}`).amount,
    ).toBe(100n)
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${BOB}-${DELEGATE_1}`).amount,
    ).toBe(100n)
  })

  it("creates protocol mapping for new 'to' position", async () => {
    const fakeDb = makeFakeDb()
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: zeroAddress,
      to: ALICE,
    })
    const mapping = fakeDb.stores
      .get("protocol_mapping")!
      .get(`multi_delegate-${ALICE}-${DELEGATE_1}`)
    expect(mapping).toBeDefined()
    expect(mapping.operatorAddress).toBe(ALICE)
    expect(mapping.protocol).toBe("multi_delegate")
  })

  it("uses proxy.id as childAddress when proxy exists", async () => {
    const fakeDb = makeFakeDb()
    // Pre-seed a proxy for DELEGATE_1
    fakeDb.stores
      .get("multi_delegate_proxy")!
      .set(DELEGATE_1, { id: DELEGATE_1, delegate: ALICE })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      ...BASE_PARAMS,
      from: zeroAddress,
      to: ALICE,
    })
    const mapping = fakeDb.stores
      .get("protocol_mapping")!
      .get(`multi_delegate-${ALICE}-${DELEGATE_1}`)
    expect(mapping.childAddress).toBe(DELEGATE_1)
  })
})

// ─── handleProxyDeployed ─────────────────────────────────────────────────────

describe("handleProxyDeployed", () => {
  it("inserts a multi_delegate_proxy record", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { delegate: ALICE, proxyAddress: BOB },
      block: { number: 500n, timestamp: 1n },
      transaction: { from: ALICE, hash: "0xabc" },
      log: { logIndex: 0 },
    }
    await handleProxyDeployed(event as any, makeContext(fakeDb.db))
    const proxy = fakeDb.stores.get("multi_delegate_proxy")!.get(BOB)
    expect(proxy).toBeDefined()
    expect(proxy.voter).toBe(ALICE)
  })

  it("stores deployer as transaction.from (normalized)", async () => {
    const fakeDb = makeFakeDb()
    const DEPLOYER = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
    const event = {
      args: { delegate: ALICE, proxyAddress: BOB },
      block: { number: 500n, timestamp: 1n },
      transaction: { from: DEPLOYER, hash: "0xabc" },
      log: { logIndex: 0 },
    }
    await handleProxyDeployed(event as any, makeContext(fakeDb.db))
    const proxy = fakeDb.stores.get("multi_delegate_proxy")!.get(BOB)
    expect(proxy.deployer).toBe(DEPLOYER.toLowerCase())
  })

  it("does not overwrite existing proxy (onConflictDoNothing)", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores
      .get("multi_delegate_proxy")!
      .set(BOB, { id: BOB, voter: "original", deployer: "original", createdAtBlock: 0n })
    const event = {
      args: { delegate: ALICE, proxyAddress: BOB },
      block: { number: 999n, timestamp: 1n },
      transaction: { from: ALICE, hash: "0xabc" },
      log: { logIndex: 0 },
    }
    await handleProxyDeployed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("multi_delegate_proxy")!.get(BOB).voter).toBe("original")
  })
})

// ─── handleTransferSingle ────────────────────────────────────────────────────

describe("handleTransferSingle", () => {
  it("inserts a single transfer record and creates position", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: zeroAddress, to: ALICE, id: TOKEN_ID_1, value: 100n },
      block: { number: 1000n, timestamp: 1n },
      transaction: { hash: "0xsingle" },
      log: { logIndex: 7 },
    }
    await handleTransferSingle(event as any, makeContext(fakeDb.db))
    // logId = "0xsingle-7"
    expect(fakeDb.stores.get("multi_delegate_transfer")!.has("0xsingle-7")).toBe(true)
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${ALICE}-${DELEGATE_1}`)?.amount,
    ).toBe(100n)
  })
})

// ─── handleTransferBatch ─────────────────────────────────────────────────────

describe("handleTransferBatch", () => {
  it("processes each (id, value) pair independently", async () => {
    const fakeDb = makeFakeDb()
    const TOKEN_ID_2 = 2n
    const DELEGATE_2 = "0x0000000000000000000000000000000000000002"
    const event = {
      args: {
        from: zeroAddress,
        to: ALICE,
        ids: [TOKEN_ID_1, TOKEN_ID_2],
        values: [100n, 200n],
      },
      block: { number: 1000n, timestamp: 1n },
      transaction: { hash: "0xbatch" },
      log: { logIndex: 0 },
    }
    await handleTransferBatch(event as any, makeContext(fakeDb.db))

    // Two positions created
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${ALICE}-${DELEGATE_1}`)?.amount,
    ).toBe(100n)
    expect(
      fakeDb.stores.get("multi_delegate_position")!.get(`${ALICE}-${DELEGATE_2}`)?.amount,
    ).toBe(200n)

    // Two transfer records with distinct IDs (logId = "0xbatch-0", suffixed with index)
    const transfers = fakeDb.stores.get("multi_delegate_transfer")!
    expect(transfers.has("0xbatch-0-0")).toBe(true)
    expect(transfers.has("0xbatch-0-1")).toBe(true)
  })

  it("handles empty ids array without error", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: {
        from: zeroAddress,
        to: ALICE,
        ids: [],
        values: [],
      },
      block: { number: 1000n, timestamp: 1n },
      transaction: { hash: "0xempty" },
      log: { logIndex: 0 },
    }
    await handleTransferBatch(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("multi_delegate_transfer")!.size).toBe(0)
  })
})

describe("processMultiDelegateTransfer: position accumulation", () => {
  it("adds to an existing position when 'to' already has tokens for that delegate", async () => {
    // Spec: ERC1155 transfers accumulate — a second delegation to the same delegate
    // increases the position, not replaces it
    const fakeDb = makeFakeDb()
    const posId = `${BOB}-${DELEGATE_1}`
    fakeDb.stores.get("multi_delegate_position")!.set(posId, { id: posId, amount: 100n, lastUpdatedBlock: 0n })
    await processMultiDelegateTransfer({
      db: fakeDb.db as any,
      transferId: "tx-accumulate",
      from: zeroAddress,
      to: BOB,
      tokenId: TOKEN_ID_1,
      value: 50n,
      blockNumber: 2000n,
      logIndex: 0,
      timestamp: 2n,
      transactionHash: "0xacc",
    })
    // 100 existing + 50 new = 150
    expect(fakeDb.stores.get("multi_delegate_position")!.get(posId)?.amount).toBe(150n)
    expect(fakeDb.stores.get("multi_delegate_position")!.get(posId)?.lastUpdatedBlock).toBe(2000n)
  })
})

describe("handler registration smoke tests", () => {
  it("registerMultiDelegateHandlers does not throw (ponder.on wiring)", async () => {
    const { registerMultiDelegateHandlers } = await import("../../src/handlers/multiDelegate.js")
    expect(() => registerMultiDelegateHandlers()).not.toThrow()
  })
})
