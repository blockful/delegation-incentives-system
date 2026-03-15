import { describe, it, expect, beforeEach } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { DelegationAdapter } from "../DelegationAdapter.js"
import { seconds } from "@ens-dis/domain"

// delegation events: delegator → toDelegate at timestamp
const DELEGATION_EVENTS = [
  // delegator1 delegated to delegate_a at t=100
  { id: "ev1", delegatorId: "0xdelegator1", fromDelegateId: "0x0", toDelegateId: "0xdelegate_a", delegatedValue: 1000n, timestamp: 100n, blockNumber: 10n, transactionHash: "0x1" },
  // delegator2 delegated to delegate_a at t=200
  { id: "ev2", delegatorId: "0xdelegator2", fromDelegateId: "0x0", toDelegateId: "0xdelegate_a", delegatedValue: 2000n, timestamp: 200n, blockNumber: 20n, transactionHash: "0x2" },
  // delegator1 re-delegated to delegate_b at t=300
  { id: "ev3", delegatorId: "0xdelegator1", fromDelegateId: "0xdelegate_a", toDelegateId: "0xdelegate_b", delegatedValue: 1000n, timestamp: 300n, blockNumber: 30n, transactionHash: "0x3" },
]

const ENS_DELEGATIONS = [
  { id: "0xdelegator1", delegateId: "0xdelegate_b", lastUpdatedBlock: 30n },
  { id: "0xdelegator2", delegateId: "0xdelegate_a", lastUpdatedBlock: 20n },
  { id: "0xdelegator3", delegateId: "0xdelegate_a", lastUpdatedBlock: 5n },
]

const ENS_BALANCES = [
  { id: "0xdelegator1", balance: 1000n, lastUpdatedBlock: 30n },
  { id: "0xdelegator2", balance: 2000n, lastUpdatedBlock: 20n },
  { id: "0xdelegator3", balance: 3000n, lastUpdatedBlock: 5n },
]

describe("DelegationAdapter.getActiveDelegations", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({
      ens_delegation_event: DELEGATION_EVENTS,
      ens_delegation: ENS_DELEGATIONS,
      ens_balance: ENS_BALANCES,
    })
  })

  it("returns delegations as of past timestamp (before re-delegation)", async () => {
    const adapter = new DelegationAdapter(db)
    // At t=250: delegator1 → delegate_a, delegator2 → delegate_a
    const results = await adapter.getActiveDelegations(["0xdelegate_a"], seconds(250n))

    const delegatorIds = results.map((d) => d.delegatorId)
    expect(delegatorIds).toContain("0xdelegator1")
    expect(delegatorIds).toContain("0xdelegator2")
    expect(results).toHaveLength(2)
  })

  it("excludes re-delegated addresses after re-delegation", async () => {
    const adapter = new DelegationAdapter(db)
    // At t=400: delegator1 re-delegated to delegate_b, so only delegator2 → delegate_a
    const results = await adapter.getActiveDelegations(["0xdelegate_a"], seconds(400n))

    const delegatorIds = results.map((d) => d.delegatorId)
    expect(delegatorIds).not.toContain("0xdelegator1")
    expect(delegatorIds).toContain("0xdelegator2")
    expect(results).toHaveLength(1)
  })

  it("returns empty array for empty delegate list", async () => {
    const adapter = new DelegationAdapter(db)
    const results = await adapter.getActiveDelegations([], seconds(400n))
    expect(results).toHaveLength(0)
  })

  it("returns empty array when no events before timestamp", async () => {
    const adapter = new DelegationAdapter(db)
    const results = await adapter.getActiveDelegations(["0xdelegate_a"], seconds(50n))
    expect(results).toHaveLength(0)
  })
})

describe("DelegationAdapter.getAccountBalances", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({
      ens_delegation_event: DELEGATION_EVENTS,
      ens_delegation: ENS_DELEGATIONS,
      ens_balance: ENS_BALANCES,
    })
  })

  it("returns current delegations with balances", async () => {
    const adapter = new DelegationAdapter(db)
    const results = await adapter.getAccountBalances()

    expect(results).toHaveLength(3)
    const byId = new Map(results.map((r) => [r.accountId, r]))

    expect(byId.get("0xdelegator1")?.balance).toBe(1000n)
    expect(byId.get("0xdelegator1")?.delegate).toBe("0xdelegate_b")

    expect(byId.get("0xdelegator2")?.balance).toBe(2000n)
    expect(byId.get("0xdelegator2")?.delegate).toBe("0xdelegate_a")

    expect(byId.get("0xdelegator3")?.balance).toBe(3000n)
  })

  it("uses 0 balance for delegator with no balance entry", async () => {
    const dbNoBalance = new FakePonderDb({
      ens_delegation: [{ id: "0xorphan", delegateId: "0xdelegate_a", lastUpdatedBlock: 5n }],
      ens_balance: [],
    })
    const adapter = new DelegationAdapter(dbNoBalance)
    const results = await adapter.getAccountBalances()

    expect(results).toHaveLength(1)
    expect(results[0].balance).toBe(0n)
  })
})
