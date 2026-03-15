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
})

describe("VotingPowerAdapter.getAggregateDelegatedPower (TWAP)", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ ens_voting_power_snapshot: SNAPSHOTS })
  })

  it("computes TWAP for a single delegate over the window", async () => {
    const adapter = new VotingPowerAdapter(db)
    // 0xaaa: VP=0 at t=50..100, VP=1000 at t=100..200
    // window [50, 200] = 150s
    // TWAP = (0*50 + 1000*100) / 150 = 666n
    const result = await adapter.getAggregateDelegatedPower(
      ["0xaaa"],
      seconds(50n),
      seconds(200n),
    )
    expect(result).toBe(666n)
  })

  it("uses base VP from snapshot before window start", async () => {
    const adapter = new VotingPowerAdapter(db)
    // 0xaaa: VP=1000 (set at t=100) at window start t=150, then VP=1500 at t=200
    // window [150, 200] = 50s
    // TWAP = (1000*50 + 1500*0) / 50 = 1000n
    const result = await adapter.getAggregateDelegatedPower(
      ["0xaaa"],
      seconds(150n),
      seconds(200n),
    )
    expect(result).toBe(1000n)
  })

  it("sums TWAP across multiple delegates", async () => {
    const adapter = new VotingPowerAdapter(db)
    // window [50, 200] = 150s
    // 0xaaa TWAP = 666n
    // 0xbbb: VP=0 at t=50..150, VP=800 at t=150..200 → (0*100 + 800*50)/150 = 266n
    // total = 932n
    const result = await adapter.getAggregateDelegatedPower(
      ["0xaaa", "0xbbb"],
      seconds(50n),
      seconds(200n),
    )
    expect(result).toBe(932n)
  })

  it("only sums provided active delegates (not all)", async () => {
    const adapter = new VotingPowerAdapter(db)
    // Only 0xaaa in window [150, 200]: base VP=1000 → TWAP = 1000n
    const result = await adapter.getAggregateDelegatedPower(
      ["0xaaa"],
      seconds(150n),
      seconds(200n),
    )
    expect(result).toBe(1000n)
  })

  it("returns 0n for empty delegate list", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getAggregateDelegatedPower([], seconds(50n), seconds(200n))
    expect(result).toBe(0n)
  })

  it("returns 0n for delegate with no snapshots in or before the window", async () => {
    const adapter = new VotingPowerAdapter(db)
    // 0xccc has its first snapshot at t=300, window ends at t=200
    const result = await adapter.getAggregateDelegatedPower(
      ["0xccc"],
      seconds(50n),
      seconds(200n),
    )
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

  it("handles checksummed addresses in getAggregateDelegatedPower", async () => {
    const adapter = new VotingPowerAdapter(db)
    // window [50, 200] → 0xaaa TWAP=666, 0xbbb TWAP=266, total=932
    const result = await adapter.getAggregateDelegatedPower(
      ["0xAAA", "0xBBB"],
      seconds(50n),
      seconds(200n),
    )
    expect(result).toBe(932n)
  })

  it("handles checksummed addresses in getVotingPower", async () => {
    const adapter = new VotingPowerAdapter(db)
    const result = await adapter.getVotingPower(["0xAAA", "0xBBB"])
    expect(result.get("0xaaa")).toBe(1500n)
    expect(result.get("0xbbb")).toBe(800n)
  })
})
