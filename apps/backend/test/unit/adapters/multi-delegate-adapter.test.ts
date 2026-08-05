import { describe, expect, it } from "vitest";
import { createMultiDelegateAdapter } from "../../../src/adapters/multi-delegate-adapter.js";
import { FakePonderDb, type Row } from "../../doubles/fake-ponder-db.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProxyRow(overrides: Partial<Row> & { id: string }): Row {
  return {
    voter: "0x1111111111111111111111111111111111111111",
    deployer: "0x2222222222222222222222222222222222222222",
    createdAtBlock: 1_000n,
    ...overrides,
  };
}

function makeDb(rows: Row[]): FakePonderDb {
  return new FakePonderDb({ multi_delegate_proxy: rows });
}

// ─── getProxyAddresses ───────────────────────────────────────────────────────

describe("createMultiDelegateAdapter.getProxyAddresses", () => {
  it("returns every proxy vault address in the multi_delegate_proxy table", async () => {
    const rows = [
      makeProxyRow({
        id: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        voter: "0x1111111111111111111111111111111111111111",
      }),
      makeProxyRow({
        id: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        voter: "0x3333333333333333333333333333333333333333",
      }),
    ];
    const adapter = createMultiDelegateAdapter(makeDb(rows) as any);

    const result = await adapter.getProxyAddresses();

    expect(result).toEqual([
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ]);
  });

  it("lowercases addresses so set membership against indexer addresses never misses", async () => {
    // The ProxyDeployed handler lowercases ids on write, but the exclusion is
    // money-critical: a checksummed row must still match the lowercase
    // tokenHolder addresses coming out of the delegation adapter.
    const rows = [
      makeProxyRow({ id: "0xAbCdEF0000000000000000000000000000000001" }),
    ];
    const adapter = createMultiDelegateAdapter(makeDb(rows) as any);

    const result = await adapter.getProxyAddresses();

    expect(result).toEqual(["0xabcdef0000000000000000000000000000000001"]);
  });

  it("returns an empty list when no proxies were ever deployed", async () => {
    const adapter = createMultiDelegateAdapter(makeDb([]) as any);

    const result = await adapter.getProxyAddresses();

    expect(result).toEqual([]);
  });
});
