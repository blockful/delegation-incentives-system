import { beforeEach, describe, expect, it, vi } from "vitest";

// wallet_alias lives in the app-owned Postgres pool (src/db/app-tables.ts),
// not the Ponder db, so the adapter is tested by mocking getAppDb with a
// minimal select().from() chain returning seeded rows.
const selectFrom = vi.fn<() => Promise<unknown[]>>();
vi.mock("../../../src/db/app-tables.js", () => ({
  walletAlias: { _tableName: "wallet_alias" },
  getAppDb: () => ({
    db: { select: () => ({ from: () => selectFrom() }) },
    ready: Promise.resolve(),
  }),
}));

const { createWalletAliasAdapter } = await import(
  "../../../src/adapters/wallet-alias-adapter.js"
);

describe("createWalletAliasAdapter.getAliases", () => {
  beforeEach(() => {
    selectFrom.mockReset();
  });

  it("returns curated alias pairs", async () => {
    selectFrom.mockResolvedValue([
      {
        secondaryAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        primaryAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        source: "operator",
      },
    ]);
    const adapter = createWalletAliasAdapter();

    const result = await adapter.getAliases();

    expect(result).toEqual([
      {
        secondary: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        primary: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    ]);
  });

  it("lowercases checksummed rows so they match lowercase indexer addresses", async () => {
    // Aliases are consumed by exact-string Map lookups against lowercase
    // indexer addresses; a checksummed operator-curated row that is not
    // normalized silently never matches, reopening cap evasion.
    selectFrom.mockResolvedValue([
      {
        secondaryAddress: "0xAbCdEf0000000000000000000000000000000001",
        primaryAddress: "0xFeDcBa0000000000000000000000000000000002",
        source: "operator",
      },
    ]);
    const adapter = createWalletAliasAdapter();

    const result = await adapter.getAliases();

    expect(result).toEqual([
      {
        secondary: "0xabcdef0000000000000000000000000000000001",
        primary: "0xfedcba0000000000000000000000000000000002",
      },
    ]);
  });

  it("returns an empty list when no aliases are configured", async () => {
    selectFrom.mockResolvedValue([]);
    const adapter = createWalletAliasAdapter();

    const result = await adapter.getAliases();

    expect(result).toEqual([]);
  });
});
