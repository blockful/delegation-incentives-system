import { describe, it, expect } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { WalletAliasAdapter } from "../WalletAliasAdapter.js"

describe("WalletAliasAdapter.getAliases", () => {
  it("returns all wallet aliases", async () => {
    const db = new FakePonderDb({
      wallet_alias: [
        { secondaryAddress: "0xSEC1", primaryAddress: "0xPRI1", source: "manual" },
        { secondaryAddress: "0xSEC2", primaryAddress: "0xPRI1", source: "ens-dao-verified" },
      ],
    })
    const adapter = new WalletAliasAdapter(db)
    const results = await adapter.getAliases()

    expect(results).toHaveLength(2)
    expect(results[0].secondaryAddress).toBe("0xsec1")
    expect(results[0].primaryAddress).toBe("0xpri1")
    expect(results[0].source).toBe("manual")
  })

  it("returns empty array gracefully when table is empty", async () => {
    const db = new FakePonderDb({ wallet_alias: [] })
    const adapter = new WalletAliasAdapter(db)
    const results = await adapter.getAliases()
    expect(results).toHaveLength(0)
  })
})
