import { describe, it, expect } from "vitest"
import {
  handleVotingVestingPlanCreated,
  handleVotingVestingVaultCreated,
  handleVotingVestingPlanRedeemed,
  handleVotingVestingPlanRevoked,
  handleVotingVestingTransfer,
} from "../../src/handlers/hedgeyVotingVesting.js"
import { zeroAddress } from "viem"

// These must match hedgey-voting-vesting.ts (lowercased)
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72"
const NON_ENS_TOKEN = "0x1111111111111111111111111111111111111111"
const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
const VESTING_ADMIN = "0xdddddddddddddddddddddddddddddddddddddddd"
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
    ["voting_vesting_plan", new Map<string, any>()],
    ["voting_vesting_vault", new Map<string, any>()],
    ["voting_vesting_nft_ownership", new Map<string, any>()],
    ["voting_vesting_balance_event", new Map<string, any>()],
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
      vestingAdmin: VESTING_ADMIN,
      adminTransferOBO: true,
      ...overrides,
    },
    block: { number: 100n, timestamp: 1n },
    transaction: { hash: "0xabc" },
    log: { logIndex: 0 },
  }
}

async function seedPlan(fakeDb: ReturnType<typeof makeFakeDb>, id = 1n) {
  await handleVotingVestingPlanCreated(
    makePlanCreatedEvent({ id }) as any,
    makeContext(fakeDb.db),
  )
}

// ─── HedgeyVotingVesting:PlanCreated ──────────────────────────────────────────

describe("HedgeyVotingVesting:PlanCreated", () => {
  it("inserts voting vesting plan and ownership row for ENS token", async () => {
    const fakeDb = makeFakeDb()
    await handleVotingVestingPlanCreated(makePlanCreatedEvent() as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("voting_vesting_plan")!.get("1")
    expect(plan).toBeDefined()
    expect(plan.amount).toBe(1000n)
    expect(plan.remainder).toBe(1000n)
    expect(plan.token).toBe(ENS_TOKEN)
    expect(plan.createdAtBlock).toBe(100n)
    expect(plan.createdAtTimestamp).toBe(1n)
    expect(plan.createdAtLogIndex).toBe(0)
    const ownership = fakeDb.stores.get("voting_vesting_nft_ownership")!.get("1-100-0")
    expect(ownership.owner).toBe(ALICE)
  })

  it("skips non-ENS token plans", async () => {
    const fakeDb = makeFakeDb()
    await handleVotingVestingPlanCreated(
      makePlanCreatedEvent({ token: NON_ENS_TOKEN }) as any,
      makeContext(fakeDb.db),
    )
    expect(fakeDb.stores.get("voting_vesting_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.size).toBe(0)
  })

  it("normalizes recipient address to lowercase", async () => {
    const fakeDb = makeFakeDb()
    const event = makePlanCreatedEvent({
      recipient: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    })
    await handleVotingVestingPlanCreated(event as any, makeContext(fakeDb.db))
    const plan = fakeDb.stores.get("voting_vesting_plan")!.get("1")
    expect(plan.recipient).toBe(ALICE)
  })
})

// ─── HedgeyVotingVesting:VotingVaultCreated ───────────────────────────────────

describe("HedgeyVotingVesting:VotingVaultCreated", () => {
  const vaultEvent = {
    args: { id: 1n, vaultAddress: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" },
    block: { number: 150n, timestamp: 5n },
    transaction: { hash: "0xdef" },
    log: { logIndex: 3 },
  }

  it("records planId→vault mapping with lowercase address", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    await handleVotingVestingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    const vault = fakeDb.stores.get("voting_vesting_vault")!.get("1")
    expect(vault).toBeDefined()
    expect(vault.vaultAddress).toBe(VAULT)
    expect(vault.createdAtTimestamp).toBe(5n)
  })

  it("inserts a vault_funded balance event with the plan's current remainder", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    // Redeem 100 before the vault exists — remainder drops to 900
    await handleVotingVestingPlanRedeemed(
      {
        args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n, resetDate: 2n },
        block: { number: 120n, timestamp: 2n },
        transaction: { hash: "0x1" },
        log: { logIndex: 0 },
      } as any,
      makeContext(fakeDb.db),
    )
    await handleVotingVestingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    const funded = fakeDb.stores.get("voting_vesting_balance_event")!.get("1-150-3")
    expect(funded).toBeDefined()
    expect(funded.kind).toBe("vault_funded")
    expect(funded.planRemainder).toBe(900n)
  })

  it("records the vault but no balance event when the plan is unknown (non-ENS)", async () => {
    const fakeDb = makeFakeDb()
    await handleVotingVestingVaultCreated(vaultEvent as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_vault")!.has("1")).toBe(true)
    expect(fakeDb.stores.get("voting_vesting_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingVesting:PlanRedeemed ─────────────────────────────────────────

describe("HedgeyVotingVesting:PlanRedeemed", () => {
  it("updates remainder and inserts a redemption balance event", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    const event = {
      args: { id: 1n, amountRedeemed: 100n, planRemainder: 900n, resetDate: 2n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handleVotingVestingPlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").remainder).toBe(900n)
    const be = fakeDb.stores.get("voting_vesting_balance_event")!.get("1-200-0")
    expect(be.kind).toBe("redemption")
    expect(be.planRemainder).toBe(900n)
    expect(be.blockNumber).toBe(200n)
  })

  it("tracks remainder across multiple redemptions", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    for (const [remainder, block] of [[900n, 200n], [850n, 300n]] as const) {
      await handleVotingVestingPlanRedeemed(
        {
          args: { id: 1n, amountRedeemed: 1000n - remainder, planRemainder: remainder, resetDate: 2n },
          block: { number: block, timestamp: block },
          transaction: { hash: "0x2" },
          log: { logIndex: 0 },
        } as any,
        makeContext(fakeDb.db),
      )
    }
    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").remainder).toBe(850n)
    expect(fakeDb.stores.get("voting_vesting_balance_event")!.size).toBe(2)
  })

  it("early returns when plan not found", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { id: 99n, amountRedeemed: 100n, planRemainder: 0n, resetDate: 2n },
      block: { number: 200n, timestamp: 2n },
      transaction: { hash: "0xdef" },
      log: { logIndex: 0 },
    }
    await handleVotingVestingPlanRedeemed(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingVesting:PlanRevoked ──────────────────────────────────────────
//
// PlanRevoked(id, amountRedeemed, revokedAmount): the UNVESTED revokedAmount
// goes back to the vestingAdmin; the vested amountRedeemed STAYS in the
// plan/vault and continues vesting — so the post-revoke remainder is
// amountRedeemed, not zero, unless nothing had vested (then the plan is
// deleted and the NFT burn Transfer fires before this event).

describe("HedgeyVotingVesting:PlanRevoked", () => {
  function makeRevokeEvent(
    overrides: Partial<{ id: bigint; amountRedeemed: bigint; revokedAmount: bigint }> = {},
  ) {
    return {
      args: {
        id: 1n,
        amountRedeemed: 400n,
        revokedAmount: 600n,
        ...overrides,
      },
      block: { number: 300n, timestamp: 10n },
      transaction: { hash: "0x3" },
      log: { logIndex: 5 },
    }
  }

  it("sets the remainder to the vested amount kept by the plan (not zero)", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    await handleVotingVestingPlanRevoked(makeRevokeEvent() as any, makeContext(fakeDb.db))

    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").remainder).toBe(400n)
    const be = fakeDb.stores.get("voting_vesting_balance_event")!.get("1-300-5")
    expect(be.kind).toBe("revocation")
    expect(be.planRemainder).toBe(400n)
    expect(be.blockNumber).toBe(300n)
  })

  it("zeroes the remainder when nothing had vested (full revoke, NFT burned)", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    // On-chain the burn Transfer fires before PlanRevoked in the same tx
    await handleVotingVestingTransfer(
      {
        args: { from: ALICE, to: zeroAddress, tokenId: 1n },
        block: { number: 300n, timestamp: 10n },
        transaction: { hash: "0x3" },
        log: { logIndex: 4 },
      } as any,
      makeContext(fakeDb.db),
    )
    await handleVotingVestingPlanRevoked(
      makeRevokeEvent({ amountRedeemed: 0n, revokedAmount: 1000n }) as any,
      makeContext(fakeDb.db),
    )

    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").remainder).toBe(0n)
    const be = fakeDb.stores.get("voting_vesting_balance_event")!.get("1-300-5")
    expect(be.kind).toBe("revocation")
    expect(be.planRemainder).toBe(0n)
    // Burn ownership row recorded by the Transfer handler
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.get("1-300-4").owner).toBe(
      zeroAddress.toLowerCase(),
    )
  })

  it("early returns when plan not found (non-ENS plan)", async () => {
    const fakeDb = makeFakeDb()
    await handleVotingVestingPlanRevoked(
      makeRevokeEvent({ id: 99n }) as any,
      makeContext(fakeDb.db),
    )
    expect(fakeDb.stores.get("voting_vesting_balance_event")!.size).toBe(0)
  })
})

// ─── HedgeyVotingVesting:Transfer ─────────────────────────────────────────────

describe("HedgeyVotingVesting:Transfer", () => {
  it("skips mint (from=zeroAddress)", async () => {
    const fakeDb = makeFakeDb()
    const event = {
      args: { from: zeroAddress, to: BOB, tokenId: 1n },
      block: { number: 1n, timestamp: 1n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleVotingVestingTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_plan")!.size).toBe(0)
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.size).toBe(0)
  })

  it("updates recipient and inserts ownership row on admin transfer to new owner", async () => {
    const fakeDb = makeFakeDb()
    await seedPlan(fakeDb)
    const event = {
      args: { from: ALICE, to: BOB, tokenId: 1n },
      block: { number: 500n, timestamp: 30n },
      transaction: { hash: "0x" },
      log: { logIndex: 0 },
    }
    await handleVotingVestingTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").recipient).toBe(BOB)
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.get("1-500-0").owner).toBe(BOB)
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
    await handleVotingVestingTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_plan")!.has("1")).toBe(true)
    // last recipient preserved on the plan row; the 0x0 ownership row wins
    // in point-in-time owner lookups
    expect(fakeDb.stores.get("voting_vesting_plan")!.get("1").recipient).toBe(ALICE)
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.get("1-600-0").owner).toBe(
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
    await handleVotingVestingTransfer(event as any, makeContext(fakeDb.db))
    expect(fakeDb.stores.get("voting_vesting_nft_ownership")!.size).toBe(0)
  })
})

describe("handler registration smoke tests", () => {
  it("registerHedgeyVotingVestingHandlers does not throw (ponder.on wiring)", async () => {
    const { registerHedgeyVotingVestingHandlers } = await import("../../src/handlers/hedgeyVotingVesting.js")
    expect(() => registerHedgeyVotingVestingHandlers()).not.toThrow()
  })
})
