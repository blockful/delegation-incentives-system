import { describe, it, expect, beforeEach } from "vitest"
import {
  handleEnsTransfer,
  handleDelegateChanged,
  handleDelegateVotesChanged,
} from "../../src/handlers/ensToken.js"
import { zeroAddress } from "viem"

// ─── Fake DB ──────────────────────────────────────────────────────────────────

type Store = Map<string, any>
type StoreMap = Map<string, Store>

function resolveTableName(table: unknown): string {
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

function makeFakeDb() {
  const stores: StoreMap = new Map([
    ["ens_balance", new Map()],
    ["ens_balance_event", new Map()],
    ["ens_delegation", new Map()],
    ["ens_delegation_event", new Map()],
    ["ens_voting_power_snapshot", new Map()],
  ])

  function store(table: unknown): Store {
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
        // Return a thenable that also exposes conflict-handling methods.
        // The thenable path handles plain `await db.insert(t).values(r)` calls.
        const obj = {
          onConflictDoUpdate: async (fn: ((existing: any) => any) | Record<string, any>) => {
            const s = store(table)
            const key = String(row.id)
            const existing = s.get(key)
            let finalRow: any
            if (existing) {
              const updates = typeof fn === "function" ? fn(existing) : fn
              finalRow = { ...existing, ...updates }
            } else {
              finalRow = { ...row }
            }
            s.set(key, finalRow)
            return finalRow
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
              const s = store(table)
              s.set(String(row.id), { ...row })
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

function makeContext(db: ReturnType<typeof makeFakeDb>["db"]) {
  return { db } as any
}

function makeTransferEvent(
  overrides: Partial<{
    from: string
    to: string
    value: bigint
    blockNumber: bigint
    timestamp: bigint
    txHash: string
    logIndex: number
  }> = {},
) {
  const o = {
    from: zeroAddress,
    to: zeroAddress,
    value: 100n,
    blockNumber: 1000n,
    timestamp: 1680000000n,
    txHash: "0xabc",
    logIndex: 1,
    ...overrides,
  }
  return {
    args: { from: o.from, to: o.to, value: o.value },
    block: { number: o.blockNumber, timestamp: o.timestamp },
    transaction: { hash: o.txHash },
    log: { logIndex: o.logIndex },
  }
}

const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

// ─── ENSToken:Transfer ────────────────────────────────────────────────────────

describe("ENSToken:Transfer", () => {
  let fakeDb: ReturnType<typeof makeFakeDb>

  beforeEach(() => {
    fakeDb = makeFakeDb()
  })

  it("skips sender balance update on mint (from=zeroAddress)", async () => {
    const event = makeTransferEvent({ from: zeroAddress, to: ALICE, value: 100n })
    await handleEnsTransfer(event as any, makeContext(fakeDb.db))
    const balances = fakeDb.stores.get("ens_balance")!
    expect(balances.has(zeroAddress.toLowerCase())).toBe(false)
    expect(balances.has(ALICE)).toBe(true)
  })

  it("skips receiver balance update on burn (to=zeroAddress)", async () => {
    fakeDb.stores.get("ens_balance")!.set(ALICE, { id: ALICE, balance: 500n, lastUpdatedBlock: 0n })
    const event = makeTransferEvent({ from: ALICE, to: zeroAddress, value: 100n })
    await handleEnsTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("ens_balance")!.has(zeroAddress.toLowerCase())).toBe(false)
  })

  it("credits receiver and debits sender on normal transfer", async () => {
    fakeDb.stores.get("ens_balance")!.set(ALICE, { id: ALICE, balance: 500n, lastUpdatedBlock: 0n })
    const event = makeTransferEvent({ from: ALICE, to: BOB, value: 100n })
    await handleEnsTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("ens_balance")!.get(ALICE).balance).toBe(400n)
    expect(fakeDb.stores.get("ens_balance")!.get(BOB).balance).toBe(100n)
  })

  it("inserts balance events for from and to", async () => {
    fakeDb.stores.get("ens_balance")!.set(ALICE, { id: ALICE, balance: 500n, lastUpdatedBlock: 0n })
    const event = makeTransferEvent({ from: ALICE, to: BOB, value: 100n, txHash: "0xdeadbeef", logIndex: 5 })
    await handleEnsTransfer(event as any, makeContext(fakeDb.db))
    const events = fakeDb.stores.get("ens_balance_event")!
    expect(events.has("0xdeadbeef-5-from")).toBe(true)
    expect(events.has("0xdeadbeef-5-to")).toBe(true)
    expect(events.get("0xdeadbeef-5-from").delta).toBe(-100n)
    expect(events.get("0xdeadbeef-5-to").delta).toBe(100n)
  })

  it("creates balance record for new receiver (not previously in DB)", async () => {
    const event = makeTransferEvent({ from: zeroAddress, to: ALICE, value: 200n })
    await handleEnsTransfer(event as any, makeContext(fakeDb.db))
    const balance = fakeDb.stores.get("ens_balance")!.get(ALICE)
    expect(balance.balance).toBe(200n)
  })

  it("accumulates balance on repeated mints to same address", async () => {
    const event1 = makeTransferEvent({ from: zeroAddress, to: ALICE, value: 100n, logIndex: 1 })
    const event2 = makeTransferEvent({ from: zeroAddress, to: ALICE, value: 50n, logIndex: 2 })
    await handleEnsTransfer(event1 as any, makeContext(fakeDb.db))
    await handleEnsTransfer(event2 as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("ens_balance")!.get(ALICE).balance).toBe(150n)
  })
})

// ─── ENSToken:DelegateChanged ─────────────────────────────────────────────────

describe("ENSToken:DelegateChanged", () => {
  let fakeDb: ReturnType<typeof makeFakeDb>

  beforeEach(() => {
    fakeDb = makeFakeDb()
  })

  it("upserts delegation record with toDelegate", async () => {
    const event = {
      args: { delegator: ALICE, fromDelegate: zeroAddress, toDelegate: BOB },
      block: { number: 1000n, timestamp: 1680000000n },
      transaction: { hash: "0xabc" },
      log: { logIndex: 1 },
    }
    await handleDelegateChanged(event as any, makeContext(fakeDb.db))
    const delegation = fakeDb.stores.get("ens_delegation")!.get(ALICE)
    expect(delegation.delegateId).toBe(BOB)
  })

  it("uses 0 delegatedValue when no balance record exists", async () => {
    const event = {
      args: { delegator: ALICE, fromDelegate: zeroAddress, toDelegate: BOB },
      block: { number: 1000n, timestamp: 1n },
      transaction: { hash: "0xabc" },
      log: { logIndex: 1 },
    }
    await handleDelegateChanged(event as any, makeContext(fakeDb.db))
    const evt = fakeDb.stores.get("ens_delegation_event")!.get("0xabc-1")
    expect(evt.delegatedValue).toBe(0n)
  })

  it("uses current balance as delegatedValue", async () => {
    fakeDb.stores.get("ens_balance")!.set(ALICE, { id: ALICE, balance: 1000n, lastUpdatedBlock: 0n })
    const event = {
      args: { delegator: ALICE, fromDelegate: zeroAddress, toDelegate: BOB },
      block: { number: 1000n, timestamp: 1n },
      transaction: { hash: "0xabc" },
      log: { logIndex: 2 },
    }
    await handleDelegateChanged(event as any, makeContext(fakeDb.db))
    const evt = fakeDb.stores.get("ens_delegation_event")!.get("0xabc-2")
    expect(evt.delegatedValue).toBe(1000n)
  })

  it("records fromDelegateId and toDelegateId in delegation event", async () => {
    const event = {
      args: { delegator: ALICE, fromDelegate: BOB, toDelegate: ALICE },
      block: { number: 500n, timestamp: 1n },
      transaction: { hash: "0xfoo" },
      log: { logIndex: 3 },
    }
    await handleDelegateChanged(event as any, makeContext(fakeDb.db))
    const evt = fakeDb.stores.get("ens_delegation_event")!.get("0xfoo-3")
    expect(evt.fromDelegateId).toBe(BOB)
    expect(evt.toDelegateId).toBe(ALICE)
  })
})

// ─── ENSToken:DelegateVotesChanged ───────────────────────────────────────────

describe("ENSToken:DelegateVotesChanged", () => {
  it("inserts a voting power snapshot with correct delta", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { delegate: ALICE, previousBalance: 100n, newBalance: 150n },
      block: { number: 999n, timestamp: 1n },
      transaction: { hash: "0xfeed" },
      log: { logIndex: 3 },
    }
    await handleDelegateVotesChanged(event as any, makeContext(fakeDb.db))
    const snap = fakeDb.stores.get("ens_voting_power_snapshot")!.get("0xfeed-3")
    expect(snap.accountId).toBe(ALICE)
    expect(snap.votingPower).toBe(150n)
    expect(snap.delta).toBe(50n)
    expect(snap.deltaMod).toBe(50n)
  })

  it("handles negative delta (VP decrease)", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { delegate: ALICE, previousBalance: 200n, newBalance: 100n },
      block: { number: 999n, timestamp: 1n },
      transaction: { hash: "0xfeed" },
      log: { logIndex: 4 },
    }
    await handleDelegateVotesChanged(event as any, makeContext(fakeDb.db))
    const snap = fakeDb.stores.get("ens_voting_power_snapshot")!.get("0xfeed-4")
    expect(snap.delta).toBe(-100n)
    expect(snap.deltaMod).toBe(100n)
  })

  it("records blockNumber, timestamp, and transactionHash on snapshot", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { delegate: BOB, previousBalance: 0n, newBalance: 500n },
      block: { number: 12345n, timestamp: 9999n },
      transaction: { hash: "0xcafe" },
      log: { logIndex: 0 },
    }
    await handleDelegateVotesChanged(event as any, makeContext(fakeDb.db))
    const snap = fakeDb.stores.get("ens_voting_power_snapshot")!.get("0xcafe-0")
    expect(snap.blockNumber).toBe(12345n)
    expect(snap.timestamp).toBe(9999n)
    expect(snap.transactionHash).toBe("0xcafe")
  })
})

describe("handler registration smoke tests", () => {
  it("registerEnsTokenHandlers does not throw (ponder.on wiring)", async () => {
    const { registerEnsTokenHandlers } = await import("../../src/handlers/ensToken.js")
    expect(() => registerEnsTokenHandlers()).not.toThrow()
  })

  it("ponder.on callbacks delegate to exported handler functions", async () => {
    const { ponder } = await import("../../src/common/ponder.js")
    const callbacks = new Map<string, Function>()
    const saved = ponder.on
    ;(ponder as any).on = (name: string, cb: Function) => { callbacks.set(name, cb) }

    const { registerEnsTokenHandlers } = await import("../../src/handlers/ensToken.js")
    registerEnsTokenHandlers()
    ;(ponder as any).on = saved

    const fakeDb = makeFakeDb()
    const ctx = makeContext(fakeDb.db)

    await callbacks.get("ENSToken:Transfer")!({
      event: {
        args: { from: zeroAddress, to: ALICE, value: 100n },
        block: { number: 1000n, timestamp: 1n },
        transaction: { hash: "0xcb0" },
        log: { logIndex: 0 },
      },
      context: ctx,
    })
    expect(fakeDb.stores.get("ens_balance")!.has(ALICE)).toBe(true)

    await callbacks.get("ENSToken:DelegateChanged")!({
      event: {
        args: { delegator: ALICE, fromDelegate: zeroAddress, toDelegate: BOB },
        block: { number: 1000n, timestamp: 1n },
        transaction: { hash: "0xcb1" },
        log: { logIndex: 0 },
      },
      context: ctx,
    })
    expect(fakeDb.stores.get("ens_delegation")!.has(ALICE)).toBe(true)

    await callbacks.get("ENSToken:DelegateVotesChanged")!({
      event: {
        args: { delegate: ALICE, previousBalance: 0n, newBalance: 100n },
        block: { number: 1000n, timestamp: 1n },
        transaction: { hash: "0xcb2" },
        log: { logIndex: 1 },
      },
      context: ctx,
    })
    expect(fakeDb.stores.get("ens_voting_power_snapshot")!.has("0xcb2-1")).toBe(true)
  })
})
