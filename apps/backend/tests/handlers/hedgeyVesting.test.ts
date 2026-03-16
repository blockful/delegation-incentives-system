import { describe, it, expect, beforeEach } from "vitest"
import {
  handlePlanCreated,
  handlePlanRedeemed,
  handleHedgeyTransfer,
} from "../../src/handlers/hedgeyVesting.js"
import { zeroAddress } from "viem"

// These must match constants.ts (lowercased)
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72"
const HEDGEY_VESTING_ADDRESS = "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c"
const NON_ENS_TOKEN = "0x1111111111111111111111111111111111111111"
const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

// ─── Fake DB ──────────────────────────────────────────────────────────────────

function resolveTableName(table: unknown): string {
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

function makeFakeDb() {
  const stores = new Map([
    ["vesting_plan", new Map<string, any>()],
    ["vesting_redemption", new Map<string, any>()],
    ["protocol_mapping", new Map<string, any>()],
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
          onConflictDoNothing: async () => {
            const s = store(table)
            const key = String(row.id)
            if (!s.has(key)) s.set(key, { ...row })
          },
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

function makePlanCreatedEvent(
  overrides: Partial<{ id: bigint; recipient: string; token: string }> = {},
) {
  return {
    args: {
      id: 1n,
      recipient: ALICE,
      token: ENS_TOKEN,
      amount: 1000n,
      start: 1000n,
      cliff: 500n,
      rate: 10n,
      period: 2592000n,
      ...overrides,
    },
    block: { number: 100n, timestamp: 1n },
    transaction: { hash: "0xabc" },
    log: { logIndex: 0 },
  }
}

// ─── HedgeyVesting:PlanCreated ────────────────────────────────────────────────

describe("HedgeyVesting:PlanCreated", () => {
  it("inserts vesting plan and protocol mapping for ENS token", async () => {
    const fakeDb = makeFakeDb()
    await handlePlanCreated(makePlanCreatedEvent() as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.has("1")).toBe(true)
    const mapping = fakeDb.stores.get("protocol_mapping")!.get("hedgey_vesting-1")
    expect(mapping).toBeDefined()
    expect(mapping.operatorAddress).toBe(ALICE)
    expect(mapping.childAddress).toBe(HEDGEY_VESTING_ADDRESS)
    expect(mapping.protocol).toBe("hedgey_vesting")
  })

  it("skips non-ENS token plans", async () => {
    const fakeDb = makeFakeDb()
    await handlePlanCreated(
      makePlanCreatedEvent({ token: NON_ENS_TOKEN }) as any,
      makeContext(fakeDb.db),
    )
    expect(fakeDb.stores.get("vesting_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("protocol_mapping")!.size).toBe(0)
  })

  it("normalizes recipient address to lowercase", async () => {
    const fakeDb = makeFakeDb()
    const event = makePlanCreatedEvent({
      recipient: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    })
    await handlePlanCreated(event as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("vesting_plan")!.get("1")
    expect(plan.recipient).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  })

  it("stores correct plan fields", async () => {
    const fakeDb = makeFakeDb()
    await handlePlanCreated(makePlanCreatedEvent() as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("vesting_plan")!.get("1")
    expect(plan.amount).toBe(1000n)
    expect(plan.amountRedeemed).toBe(0n)
    expect(plan.token).toBe(ENS_TOKEN)
    expect(plan.createdAtBlock).toBe(100n)
  })

  it("does not overwrite existing mapping (onConflictDoNothing)", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("protocol_mapping")!.set("hedgey_vesting-1", {
      id: "hedgey_vesting-1",
      operatorAddress: BOB,
      childAddress: HEDGEY_VESTING_ADDRESS,
      protocol: "hedgey_vesting",
    })
    await handlePlanCreated(makePlanCreatedEvent() as any, makeContext(fakeDb.db))
    // Pre-existing mapping should not be overwritten
    const mapping = fakeDb.stores.get("protocol_mapping")!.get("hedgey_vesting-1")
    expect(mapping.operatorAddress).toBe(BOB)
  })
})

// ─── HedgeyVesting:PlanRedeemed ───────────────────────────────────────────────

describe("HedgeyVesting:PlanRedeemed", () => {
  it("updates amountRedeemed and inserts vestingRedemption", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, amountRedeemed: 0n })
    const event = {
      args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handlePlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.get("1").amountRedeemed).toBe(100n)
    expect(fakeDb.stores.get("vesting_redemption")!.has("1-200")).toBe(true)
  })

  it("accumulates amountRedeemed across multiple redemptions", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, amountRedeemed: 50n })
    const event = {
      args: { id: 1n, amountRedeemed: 100n, planRemainder: 850n },
      block: { number: 300n, timestamp: 3n },
      transaction: { hash: "0xghi" },
      log: { logIndex: 0 },
    }
    await handlePlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.get("1").amountRedeemed).toBe(150n)
  })

  it("early returns when plan not found", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { id: 99n, amountRedeemed: 100n, planRemainder: 0n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handlePlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_redemption")!.size).toBe(0)
  })

  it("stores planRemainder and blockNumber on redemption record", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("2", { id: 2n, amountRedeemed: 0n })
    const event = {
      args: { id: 2n, amountRedeemed: 200n, planRemainder: 800n },
      block: { number: 400n, timestamp: 4n },
      transaction: { hash: "0xjkl" },
      log: { logIndex: 0 },
    }
    await handlePlanRedeemed(event as any, makeContext(fakeDb.db))
    const redemption = fakeDb.stores.get("vesting_redemption")!.get("2-400")
    expect(redemption.planRemainder).toBe(800n)
    expect(redemption.blockNumber).toBe(400n)
    expect(redemption.amountRedeemed).toBe(200n)
  })
})

// ─── HedgeyVesting:Transfer ───────────────────────────────────────────────────

describe("HedgeyVesting:Transfer", () => {
  it("skips mint (from=zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: zeroAddress, to: BOB, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleHedgeyTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.size).toBe(0)
  })

  it("deletes protocol mapping on burn (to=zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, recipient: ALICE })
    fakeDb.stores
      .get("protocol_mapping")!
      .set("hedgey_vesting-1", { id: "hedgey_vesting-1", operatorAddress: ALICE })
    const event = {
      args: { from: ALICE, to: zeroAddress, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleHedgeyTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("protocol_mapping")!.has("hedgey_vesting-1")).toBe(false)
  })

  it("does not delete vesting plan on burn", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, recipient: ALICE })
    fakeDb.stores
      .get("protocol_mapping")!
      .set("hedgey_vesting-1", { id: "hedgey_vesting-1", operatorAddress: ALICE })
    const event = {
      args: { from: ALICE, to: zeroAddress, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleHedgeyTransfer(event as any, makeContext(fakeDb.db))
    // Vesting plan remains
    expect(fakeDb.stores.get("vesting_plan")!.has("1")).toBe(true)
  })

  it("updates recipient and mapping on transfer to new owner", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, recipient: ALICE })
    fakeDb.stores
      .get("protocol_mapping")!
      .set("hedgey_vesting-1", { id: "hedgey_vesting-1", operatorAddress: ALICE })
    const event = {
      args: { from: ALICE, to: BOB, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleHedgeyTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.get("1").recipient).toBe(BOB)
    expect(
      fakeDb.stores.get("protocol_mapping")!.get("hedgey_vesting-1").operatorAddress,
    ).toBe(BOB)
  })

  it("skips when plan not found", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: ALICE, to: BOB, tokenId: 99n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleHedgeyTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("vesting_plan")!.size).toBe(0)
  })
})

// ─── hedgeyVesting edge cases ────────────────────────────────────────────────

describe("hedgeyVesting edge cases", () => {
  it("handlePlanCreated with different plan IDs creates separate plans", async () => {
    const fakeDb = makeFakeDb()
    const event1 = makePlanCreatedEvent({ id: 1n, recipient: ALICE })
    const event2 = makePlanCreatedEvent({ id: 2n, recipient: BOB })

    await handlePlanCreated(event1 as any, makeContext(fakeDb.db))
    await handlePlanCreated(event2 as any, makeContext(fakeDb.db))

    const plans = fakeDb.stores.get("vesting_plan")!
    expect(plans.size).toBe(2)
    expect(plans.has("1")).toBe(true)
    expect(plans.has("2")).toBe(true)
    expect(plans.get("1").recipient).toBe(ALICE)
    expect(plans.get("2").recipient).toBe(BOB.toLowerCase())

    // Each plan gets its own protocol mapping
    const mappings = fakeDb.stores.get("protocol_mapping")!
    expect(mappings.has("hedgey_vesting-1")).toBe(true)
    expect(mappings.has("hedgey_vesting-2")).toBe(true)
  })

  it("handlePlanRedeemed accumulates across many redemptions", async () => {
    const fakeDb = makeFakeDb()
    fakeDb.stores.get("vesting_plan")!.set("1", { id: 1n, amountRedeemed: 0n })

    const redeem1 = {
      args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n },
      block: { number: 100n, timestamp: 1n },
      transaction: { hash: "0xr1" },
      log: { logIndex: 0 },
    }
    const redeem2 = {
      args: { id: 1n, amountRedeemed: 200n, planRemainder: 700n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xr2" },
      log: { logIndex: 0 },
    }
    const redeem3 = {
      args: { id: 1n, amountRedeemed: 150n, planRemainder: 550n },
      block: { number: 300n, timestamp: 3n },
      transaction: { hash: "0xr3" },
      log: { logIndex: 0 },
    }

    await handlePlanRedeemed(redeem1 as any, makeContext(fakeDb.db))
    await handlePlanRedeemed(redeem2 as any, makeContext(fakeDb.db))
    await handlePlanRedeemed(redeem3 as any, makeContext(fakeDb.db))

    // 0 + 100 + 200 + 150 = 450
    const plan = fakeDb.stores.get("vesting_plan")!.get("1")
    expect(plan.amountRedeemed).toBe(450n)

    // Three separate redemption records
    const redemptions = fakeDb.stores.get("vesting_redemption")!
    expect(redemptions.size).toBe(3)
    expect(redemptions.has("1-100")).toBe(true)
    expect(redemptions.has("1-200")).toBe(true)
    expect(redemptions.has("1-300")).toBe(true)
  })
})

describe("handler registration smoke tests", () => {
  it("registerHedgeyVestingHandlers does not throw (ponder.on wiring)", async () => {
    const { registerHedgeyVestingHandlers } = await import("../../src/handlers/hedgeyVesting.js")
    expect(() => registerHedgeyVestingHandlers()).not.toThrow()
  })

  it("ponder.on callbacks delegate to exported handler functions", async () => {
    const { ponder } = await import("../../src/common/ponder.js")
    const callbacks = new Map<string, Function>()
    const saved = ponder.on
    ;(ponder as any).on = (name: string, cb: Function) => { callbacks.set(name, cb) }

    const { registerHedgeyVestingHandlers } = await import("../../src/handlers/hedgeyVesting.js")
    registerHedgeyVestingHandlers()
    ;(ponder as any).on = saved

    const fakeDb = makeFakeDb()
    const ctx = makeContext(fakeDb.db)

    // PlanCreated callback
    await callbacks.get("HedgeyVesting:PlanCreated")!({
      event: makePlanCreatedEvent(),
      context: ctx,
    })
    expect(fakeDb.stores.get("vesting_plan")!.has("1")).toBe(true)

    // PlanRedeemed callback
    fakeDb.stores.get("vesting_plan")!.set("10", { id: 10n, amountRedeemed: 0n })
    await callbacks.get("HedgeyVesting:PlanRedeemed")!({
      event: {
        args: { id: 10n, amountRedeemed: 50n, planRemainder: 950n },
        block: { number: 200n, timestamp: 2n },
        transaction: { hash: "0xcb1" },
        log: { logIndex: 0 },
      },
      context: ctx,
    })
    expect(fakeDb.stores.get("vesting_plan")!.get("10").amountRedeemed).toBe(50n)

    // Transfer callback
    fakeDb.stores.get("vesting_plan")!.set("11", { id: 11n, recipient: ALICE })
    fakeDb.stores.get("protocol_mapping")!.set("hedgey_vesting-11", { id: "hedgey_vesting-11", operatorAddress: ALICE })
    await callbacks.get("HedgeyVesting:Transfer")!({
      event: {
        args: { from: ALICE, to: BOB, tokenId: 11n },
        block: { number: 300n, timestamp: 3n },
        transaction: { hash: "0xcb2" },
        log: { logIndex: 0 },
      },
      context: ctx,
    })
    expect(fakeDb.stores.get("vesting_plan")!.get("11").recipient).toBe(BOB)
  })
})
