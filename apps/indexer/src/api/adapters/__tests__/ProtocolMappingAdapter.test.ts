import { describe, it, expect } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { ProtocolMappingAdapter } from "../ProtocolMappingAdapter.js"

describe("ProtocolMappingAdapter.getMappings", () => {
  it("returns all protocol mappings", async () => {
    const db = new FakePonderDb({
      protocol_mapping: [
        { id: "1", childAddress: "0xCHILD1", operatorAddress: "0xOP1", protocol: "multi_delegate" },
        { id: "2", childAddress: "0xCHILD2", operatorAddress: "0xOP2", protocol: "hedgey_vesting" },
      ],
    })
    const adapter = new ProtocolMappingAdapter(db)
    const results = await adapter.getMappings()

    expect(results).toHaveLength(2)
    expect(results[0].childAddress).toBe("0xchild1")
    expect(results[0].operatorAddress).toBe("0xop1")
    expect(results[0].protocol).toBe("multi_delegate")
  })

  it("returns empty array when table is empty", async () => {
    const db = new FakePonderDb({ protocol_mapping: [] })
    const adapter = new ProtocolMappingAdapter(db)
    const results = await adapter.getMappings()
    expect(results).toHaveLength(0)
  })
})
