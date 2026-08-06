import { describe, it, expect } from "vitest"
import {
  handleLockupPlanCreated,
  handleVotingVaultCreated,
  handleLockupPlanRedeemed,
  handleLockupPlanSegmented,
  handleLockupPlansCombined,
  handleLockupTransfer,
} from "../../src/handlers/hedgeyLockup.js"
import { zeroAddress } from "viem"

// These must match hedgey-lockup.ts (lowercased)
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72"
const NON_ENS_TOKEN = "0x1111111111111111111111111111111111111111"
const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const VAULT = "0xcccccccccccccccccccccccccccccccccccccccc"

// ─── Fake DB ──────────────────────────────────────────────────────────────────

function resolveTableName(table: unknown): string {
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

function makeFakeDb() {
  const stores = new Map([
    ["lockup_plan", new Map<string, any>()],
    ["lockup_voting_vault", new Map<string, any>()],
    ["lockup_nft_ownership", new Map<string, any>()],
    ["lockup_balance_event", new Map<string, any>()],
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
  overrides: Partial<{ id: bigint; recipient: string; token: string; amount: bigint }> = {},
) {
  return {
    args: {
      id: 1n,
      recipient: ALICE,
      token: ENS_TOKEN,
      amount: 1000n,
      start: 1000n,
      cliff: 500n,
      end: 2000n,
      rate: 10n,
      period: 2592000n,
      ...overrides,
    },
    block: { number: 100n, timestamp: 1n },
    transaction: { hash: "0xabc" },
    log: { logIndex: 0 },
  }
}

async function seedPlan(fakeDb: ReturnType<typeof makeFakeDb>, id = 1n) {
  await handleLockupPlanCreated(
    makePlanCreatedEvent({ id }) as any,
    makeContext(fakeDb.db),
  )
}

// ─── HedgeyVotingLockup:PlanCreated ───────────────────────────────────────────

describe("HedgeyVotingLockup:PlanCreated", () => {
  it("inserts lockup plan and ownership row for ENS token", async () => {
    const fakeDb = makeFakeDb()
    await handleLockupPlanCreated(makePlanCreatedEvent() as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("lockup_plan")!.get("1")
    expect(plan).toBeDefined()
    expect(plan.amount).toBe(1000n)
    expect(plan.remainder).toBe(1000n)
    expect(plan.token).toBe(ENS_TOKEN)
    expect(plan.createdAtBlock).toBe(100n)
    expect(plan.createdAtTimestamp).toBe(1n)
    expect(plan.createdAtLogIndex).toBe(0)
    const ownership = fakeDb.stores.get("lockup_nft_ownership")!.get("1-100-0")
    expect(ownership.owner).toBe(ALICE)
  })

  it("skips non-ENS token plans", async () => {
    const fakeDb = makeFakeDb()
    await handleLockupPlanCreated(
      makePlanCreatedEvent({ token: NON_ENS_TOKEN }) as any,
      makeContext(fakeDb.db),
    )
    expect(fakeDb.stores.get("lockup_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("lockup_nft_ownership")!.size).toBe(0)
  })

  it("normalizes recipient address to lowercase", async () => {
    const fakeDb = makeFakeDb()
    const event = makePlanCreatedEvent({
      recipient: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    })
    await handleLockupPlanCreated(event as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("lockup_plan")!.get("1")
    expect(plan.recipient).toBe(ALICE)
  })
})

// ─── HedgeyVotingLockup:VotingVaultCreated ────────────────────────────────────

describe("HedgeyVotingLockup:VotingVaultCreated", () => {
  const vaultEvent = {
    args: { id: 1n, vaultAddress: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" },
    block: { number: 150n, timestamp: 5n },
    transaction: { hash: "0xdef" },
    log: { logIndex: 3 },
  }

  it("records planId→vault mapping with lowercase address", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    await handleVotingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    const vault = fakeDb.stores.get("lockup_voting_vault")!.get("1")
    expect(vault).toBeDefined()
    expect(vault.vaultAddress).toBe(VAULT)
    expect(vault.createdAtTimestamp).toBe(5n)
  })

  it("inserts a vault_funded balance event with the plan's current remainder", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    // Redeem 100 before the vault exists — remainder drops to 900
    await handleLockupPlanRedeemed(
      {
        args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n, resetDate: 2n },
        block: { number: 120n, timestamp: 2n },
        transaction: { hash: "0x1" },
        log: { logIndex: 0 },
      } as any,
      makeContext(fakeDb.db),
    )
    await handleVotingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    const funded = fakeDb.stores.get("lockup_balance_event")!.get("1-150-3")
    expect(funded).toBeDefined()
    expect(funded.kind).toBe("vault_funded")
    expect(funded.planRemainder).toBe(900n)
  })

  it("records the vault but no balance event when the plan is unknown (non-ENS or segment flow)", async () => {
    const fakeDb = makeFakeDb()
    await handleVotingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_voting_vault")!.has("1")).toBe(true)
    expect(fakeDb.stores.get("lockup_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingLockup:PlanRedeemed ──────────────────────────────────────────

describe("HedgeyVotingLockup:PlanRedeemed", () => {
  it("updates remainder and inserts a redemption balance event", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    const event = {
      args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n, resetDate: 2n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handleLockupPlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_plan")!.get("1").remainder).toBe(900n)
    const be = fakeDb.stores.get("lockup_balance_event")!.get("1-200-0")
    expect(be.kind).toBe("redemption")
    expect(be.planRemainder).toBe(900n)
    expect(be.blockNumber).toBe(200n)
  })

  it("tracks remainder across multiple redemptions", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    for (const [remainder, block] of [[900n, 200n], [850n, 300n]] as const) {
      await handleLockupPlanRedeemed(
        {
          args: { id: 1n, amountRedeemed: 1000n - remainder, planRemainder: remainder, resetDate: 2n },
          block: { number: block, timestamp: block },
          transaction: { hash: "0x2" },
          log: { logIndex: 0 },
        } as any,
        makeContext(fakeDb.db),
      )
    }
    expect(fakeDb.stores.get("lockup_plan")!.get("1").remainder).toBe(850n)
    expect(fakeDb.stores.get("lockup_balance_event")!.size).toBe(2)
  })

  it("early returns when plan not found", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { id: 99n, amountRedeemed: 100n, planRemainder: 0n, resetDate: 2n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handleLockupPlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingLockup:PlanSegmented ─────────────────────────────────────────

describe("HedgeyVotingLockup:PlanSegmented", () => {
  function makeSegmentEvent(overrides: Partial<Record<string, bigint>> = {}) {
    return {
      args: {
        id: 1n,
        segmentId: 2n,
        newPlanAmount: 700n,
        newPlanRate: 7n,
        segmentAmount: 300n,
        segmentRate: 3n,
        start: 1000n,
        cliff: 500n,
        period: 2592000n,
        newPlanEnd: 2000n,
        segmentEnd: 2000n,
        ...overrides,
      },
      block: { number: 300n, timestamp: 10n },
      transaction: { hash: "0x3" },
      log: { logIndex: 5 },
    }
  }

  it("reduces the original plan remainder and creates the segment plan", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    await handleLockupPlanSegmented(makeSegmentEvent() as any, makeContext(fakeDb.db))

    expect(fakeDb.stores.get("lockup_plan")!.get("1").remainder).toBe(700n)
    const originalEvent = fakeDb.stores.get("lockup_balance_event")!.get("1-300-5")
    expect(originalEvent.kind).toBe("segment")
    expect(originalEvent.planRemainder).toBe(700n)

    const segment = fakeDb.stores.get("lockup_plan")!.get("2")
    expect(segment).toBeDefined()
    expect(segment.amount).toBe(300n)
    expect(segment.remainder).toBe(300n)
    expect(segment.recipient).toBe(ALICE)
    expect(segment.token).toBe(ENS_TOKEN)
    expect(segment.createdAtTimestamp).toBe(10n)

    const ownership = fakeDb.stores.get("lockup_nft_ownership")!.get("2-300-5")
    expect(ownership.owner).toBe(ALICE)
  })

  it("records a vault_funded event for the segment when its vault was created earlier in the tx", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    // VotingVaultCreated for the not-yet-existing segment plan (log order in
    // _segmentPlan: mint Transfer → VotingVaultCreated → PlanSegmented)
    await handleVotingVaultCreated(
      {
        args: { id: 2n, vaultAddress: VAULT },
        block: { number: 300n, timestamp: 10n },
        transaction: { hash: "0x3" },
        log: { logIndex: 4 },
      } as any,
      makeContext(fakeDb.db),
    )
    await handleLockupPlanSegmented(makeSegmentEvent() as any, makeContext(fakeDb.db))

    const funded = fakeDb.stores.get("lockup_balance_event")!.get("2-300-5")
    expect(funded).toBeDefined()
    expect(funded.kind).toBe("vault_funded")
    expect(funded.planRemainder).toBe(300n)
  })

  it("skips segmentation of unknown (non-ENS) plans", async () => {
    const fakeDb = makeFakeDb()
    await handleLockupPlanSegmented(makeSegmentEvent() as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("lockup_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingLockup:PlansCombined ─────────────────────────────────────────

describe("HedgeyVotingLockup:PlansCombined", () => {
  it("zeroes the absorbed plan and sets the surviving plan remainder", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb, 1n)
    await seedPlan(fakeDb, 2n)
    const event = {
      args: {
        id0: 1n,
        id1: 2n,
        survivingId: 1n,
        amount: 2000n,
        rate: 20n,
        start: 1000n,
        cliff: 500n,
        period: 2592000n,
        end: 2000n,
      },
      block: { number: 400n, timestamp: 20n },
      transaction: { hash: "0x4" },
      log: { logIndex: 7 },
    }
    await handleLockupPlansCombined(event as any, makeContext(fakeDb.db))

    expect(fakeDb.stores.get("lockup_plan")!.get("1").remainder).toBe(2000n)
    expect(fakeDb.stores.get("lockup_plan")!.get("2").remainder).toBe(0n)

    const survivorEvent = fakeDb.stores.get("lockup_balance_event")!.get("1-400-7")
    expect(survivorEvent.kind).toBe("combine")
    expect(survivorEvent.planRemainder).toBe(2000n)
    const absorbedEvent = fakeDb.stores.get("lockup_balance_event")!.get("2-400-7")
    expect(absorbedEvent.kind).toBe("combine")
    expect(absorbedEvent.planRemainder).toBe(0n)
  })

  it("ignores combinations of unknown (non-ENS) plans", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: {
        id0: 8n,
        id1: 9n,
        survivingId: 8n,
        amount: 500n,
        rate: 5n,
        start: 1n,
        cliff: 1n,
        period: 1n,
        end: 9n,
      },
      block: { number: 400n, timestamp: 20n },
      transaction: { hash: "0x4" },
      log: { logIndex: 0 },
    }
    await handleLockupPlansCombined(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingLockup:Transfer ──────────────────────────────────────────────

describe("HedgeyVotingLockup:Transfer", () => {
  it("skips mint (from=zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: zeroAddress, to: BOB, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleLockupTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("lockup_nft_ownership")!.size).toBe(0)
  })

  it("updates recipient and inserts ownership row on transfer to new owner", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    const event = {
      args: { from: ALICE, to: BOB, tokenId: 1n },
      block: { number: 500n, timestamp: 30n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleLockupTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_plan")!.get("1").recipient).toBe(BOB)
    expect(fakeDb.stores.get("lockup_nft_ownership")!.get("1-500-0").owner).toBe(BOB)
  })

  it("records zero-address ownership on burn but keeps the plan row", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    const event = {
      args: { from: ALICE, to: zeroAddress, tokenId: 1n },
      block: { number: 600n, timestamp: 40n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleLockupTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_plan")!.has("1")).toBe(true)
    // last recipient preserved on the plan row; the 0x0 ownership row wins
    // in point-in-time owner lookups
    expect(fakeDb.stores.get("lockup_plan")!.get("1").recipient).toBe(ALICE)
    expect(fakeDb.stores.get("lockup_nft_ownership")!.get("1-600-0").owner).toBe(
      zeroAddress.toLowerCase(),
    )
  })

  it("skips when plan not found", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: ALICE, to: BOB, tokenId: 99n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleLockupTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("lockup_nft_ownership")!.size).toBe(0)
  })
})

describe("handler registration smoke tests", () => {
  it("registerHedgeyLockupHandlers does not throw (ponder.on wiring)", async () => {
    const { registerHedgeyLockupHandlers } = await import("../../src/handlers/hedgeyLockup.js")
    expect(() => registerHedgeyLockupHandlers()).not.toThrow()
  })
})
