import { describe, it, expect, beforeEach } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { VotingPowerAdapter } from "../VotingPowerAdapter.js"
import { seconds } from "@ens-dis/domain"

const SNAPSHOTS = [
  { id: "s1", accountId: "0xaaa", votingPower: 1000n, delta: 500n, deltaMod: 500n, timestamp: 100n, blockNumber: 10n, transactionHash: "0x1" },
  { id: "s2", accountId: "0xaaa", votingPower: 1500n, delta: 500n, deltaMod: 500n, timestamp: 200n, blockNumber: 20n, transactionHash: "0x2" },
  { id: "s3", accountId: "0xbbb", votingPower: 800n,  delta: 800n, deltaMod: 800n, timestamp: 150n, blockNumber: 15n, transactionHash: "0x3" },
  { id: "s4", accountId: "0xccc", votingPower: 3000n, delta: 3000n, deltaMod: 3000n, timestamp: 300n, blockNumber: 30n, transactionHash: "0x4" },
]

describe("VotingPowerAdapter.getVotingPowerHistory", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ ens_voting_power_snapshot: SNAPSHOTS })
  })

  it("filters by accountIds and time range", async () => {
    const adapter = new VotingPowerAdapter(db)
    const results = await adapter.getVotingPowerHistory(
      ["0xaaa"],
      seconds(100n),
      seconds(150n),
    )
    expect(results).toHaveLength(1)
    expect(results[0].accountId).toBe("0xaaa")
    expect(results[0].votingPower).toBe(1000n)
  })

  it("includes both endpoints of the range", async () => {
    const adapter = new VotingPowerAdapter(db)
    const results = await adapter.getVotingPowerHistory(
      ["0xaaa"],
      seconds(100n),
      seconds(200n),
    )
    expect(results).toHaveLength(2)
  })

  it("returns empty array for accounts with no history in range", async () => {
    const adapter = new VotingPowerAdapter(db)
    const results = await adapter.getVotingPowerHistory(
      ["0xaaa"],
      seconds(500n),
      seconds(600n),
    )
    expect(results).toHaveLength(0)
  })

  it("returns empty array immediately for empty accountIds input", async () => {
    const adapter = new VotingPowerAdapter(db)
    const results = await adapter.getVotingPowerHistory([], seconds(100n), seconds(200n))
    expect(results).toHaveLength(0)
  })
})

describe("VotingPowerAdapter.getAggregateVotingPowerAt (point-in-time)", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ ens_voting_power_snapshot: SNAPSHOTS })
  })

  it("returns latest snapshot VP for a single delegate at given timestamp", async () => {
    const adapter = new VotingPowerAdapter(db)
    // 0xaaa has snapshots at t=100 (vp=1000) and t=200 (vp=1500)
    // at t=200: latest is vp=1500
    const result = await adapter.getAggregateVotingPowerAt(["0xaaa"], seconds(200n))
    expect(result).toBe(1500n)
  })

  it("picks snapshot at or before at (not after)", async () => {
    const adapter = new VotingPowerAdapter(db)
    // at t=150: latest snapshot of 0xaaa with timestamp ≤ 150 is t=100 (vp=1000)
    const result = await adapter.getAggregateVotingPowerAt(["0xaaa"], seconds(150n))
    expect(result).toBe(1000n)
  })

  it("sums point-in-time VP across multiple delegates", async () => {
    const adapter = new VotingPowerAdapter(db)
    // at t=200: 0xaaa latest=1500, 0xbbb latest (t=150)=800 → total=2300
    const result = await adapter.getAggregateVotingPowerAt(["0xaaa", "0xbbb"], seconds(200n))
    expect(result).toBe(2300n)
  })

  it("only sums provided delegates (not all)", async () => {
    const adapter = new VotingPowerAdapter(db)
    // at t=200: only 0xaaa → vp=1500
    const result = await adapter.getAggregateVotingPowerAt(["0xaaa"], seconds(200n))
    expect(result).toBe(1500n)
  })

  it("returns 0n for empty delegate list", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getAggregateVotingPowerAt([], seconds(200n))
    expect(result).toBe(0n)
  })

  it("returns 0n for delegate with no snapshot at or before at", async () => {
    const adapter = new VotingPowerAdapter(db)
    // 0xccc has its first snapshot at t=300; at t=200 → no snapshot ≤ 200 → 0
    const result = await adapter.getAggregateVotingPowerAt(["0xccc"], seconds(200n))
    expect(result).toBe(0n)
  })
})

describe("VotingPowerAdapter.getVotingPower", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ ens_voting_power_snapshot: SNAPSHOTS })
  })

  it("returns map with latest voting power per account", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getVotingPower(["0xaaa", "0xbbb"])

    expect(result.get("0xaaa")).toBe(1500n)
    expect(result.get("0xbbb")).toBe(800n)
  })

  it("returns empty map for empty account list", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getVotingPower([])
    expect(result.size).toBe(0)
  })
})

describe("VotingPowerAdapter with checksummed addresses", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ ens_voting_power_snapshot: SNAPSHOTS })
  })

  it("handles checksummed addresses in getVotingPowerHistory", async () => {
    const adapter = new VotingPowerAdapter(db)
    const results = await adapter.getVotingPowerHistory(
      ["0xAAA"],
      seconds(100n),
      seconds(150n),
    )
    expect(results).toHaveLength(1)
    expect(results[0].accountId).toBe("0xaaa")
  })

  it("handles checksummed addresses in getAggregateVotingPowerAt", async () => {
    const adapter = new VotingPowerAdapter(db)
    // at t=200: 0xaaa=1500, 0xbbb=800 → total=2300
    const result = await adapter.getAggregateVotingPowerAt(
      ["0xAAA", "0xBBB"],
      seconds(200n),
    )
    expect(result).toBe(2300n)
  })

  it("handles checksummed addresses in getVotingPower", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getVotingPower(["0xAAA", "0xBBB"])
    expect(result.get("0xaaa")).toBe(1500n)
    expect(result.get("0xbbb")).toBe(800n)
  })
})
