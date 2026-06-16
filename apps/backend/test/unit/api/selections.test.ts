import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { privateKeyToAccount } from "viem/accounts";
import { buildSelectionMessage } from "@ens-dis/domain";
import { validateSelection } from "../../../src/api/matchmaking/word-pool.js";

// In-memory stand-in for the app-owned DB. The fake intentionally ignores the
// WHERE predicate: each test scopes `store` to the address under test (one row
// or empty), so returning all rows is equivalent for the GET cases we cover.
const { store, fakeDb } = vi.hoisted(() => {
  const store = new Map<
    string,
    { address: string; words: string[]; createdAt: bigint; updatedAt: bigint }
  >();
  const fakeDb = {
    insert: () => ({
      values: (v: { address: string; words: string[]; createdAt: bigint; updatedAt: bigint }) => ({
        onConflictDoUpdate: () => {
          const existing = store.get(v.address);
          store.set(
            v.address,
            existing ? { ...existing, words: v.words, updatedAt: v.updatedAt } : v,
          );
          return Promise.resolve();
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([...store.values()]),
        }),
      }),
    }),
  };
  return { store, fakeDb };
});

vi.mock("../../../src/db/app-tables.js", () => ({
  getAppDb: () => ({ db: fakeDb, ready: Promise.resolve() }),
  wordSelections: { address: "address" },
}));

const { default: selections } = await import("../../../src/api/routes/selections.js");

// Canonical hardhat/anvil test keys (publicly known — test-only).
const account = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
);
const otherAccount = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
);

const VALID_WORDS = [
  "security",
  "decentralization",
  "public_goods_funding",
  "transparency",
  "open_source",
];

function makeApp() {
  const app = new OpenAPIHono();
  app.route("/", selections);
  app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));
  return app;
}

function put(body: unknown) {
  return makeApp().request("/selections/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  store.clear();
});

describe("buildSelectionMessage", () => {
  it("is independent of pick order and lowercases the address", () => {
    const a = buildSelectionMessage("0xABCdef0000000000000000000000000000000001", ["b", "a", "c"]);
    const b = buildSelectionMessage("0xabcdef0000000000000000000000000000000001", ["c", "a", "b"]);
    expect(a).toBe(b);
    expect(a).toContain("0xabcdef0000000000000000000000000000000001");
  });
});

describe("validateSelection", () => {
  it("accepts exactly 5 distinct in-pool words", () => {
    expect(validateSelection(VALID_WORDS)).toBeNull();
  });
  it("rejects fewer than 5", () => {
    expect(validateSelection(VALID_WORDS.slice(0, 4))).toBe("count");
  });
  it("rejects more than 5", () => {
    expect(validateSelection([...VALID_WORDS, "transparency"])).toBe("count");
  });
  it("rejects duplicates", () => {
    expect(validateSelection(["security", "security", "decentralization", "transparency", "open_source"])).toBe(
      "duplicate",
    );
  });
  it("rejects a word outside the pool", () => {
    expect(validateSelection(["security", "decentralization", "transparency", "open_source", "not_a_word"])).toBe(
      "unknown_word",
    );
  });
});

describe("PUT /selections/me", () => {
  it("stores a selection with a valid signature from the same address", async () => {
    const signature = await account.signMessage({
      message: buildSelectionMessage(account.address, VALID_WORDS),
    });

    const res = await put({ address: account.address, words: VALID_WORDS, signature });
    expect(res.status).toBe(200);

    const json = (await res.json()) as { address: string; words: string[] };
    expect(json.address).toBe(account.address.toLowerCase());
    expect(json.words).toEqual(VALID_WORDS);
    // Persisted under the lowercased address.
    expect(store.has(account.address.toLowerCase())).toBe(true);
  });

  it("rejects a signature from a different address (401)", async () => {
    // otherAccount signs a message that claims to be `account`.
    const signature = await otherAccount.signMessage({
      message: buildSelectionMessage(account.address, VALID_WORDS),
    });

    const res = await put({ address: account.address, words: VALID_WORDS, signature });
    expect(res.status).toBe(401);
    expect(store.size).toBe(0);
  });

  it("rejects when the words are tampered after signing (401)", async () => {
    const signature = await account.signMessage({
      message: buildSelectionMessage(account.address, VALID_WORDS),
    });
    const tampered = ["security", "decentralization", "public_goods_funding", "transparency", "accessibility"];

    const res = await put({ address: account.address, words: tampered, signature });
    expect(res.status).toBe(401);
    expect(store.size).toBe(0);
  });

  it("rejects a malformed signature (401)", async () => {
    const res = await put({ address: account.address, words: VALID_WORDS, signature: "0xdeadbeef" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid selection before checking the signature (400)", async () => {
    const res = await put({
      address: account.address,
      words: VALID_WORDS.slice(0, 4),
      signature: "0xdeadbeef",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid address (400)", async () => {
    const res = await put({ address: "not-an-address", words: VALID_WORDS, signature: "0xdeadbeef" });
    expect(res.status).toBe(400);
  });
});

describe("GET /selections/{address}", () => {
  it("returns a stored selection (public, no auth)", async () => {
    const addr = account.address.toLowerCase();
    store.set(addr, { address: addr, words: VALID_WORDS, createdAt: 1n, updatedAt: 2n });

    const res = await makeApp().request(`/selections/${account.address}`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { address: string; words: string[] };
    expect(json.address).toBe(addr);
    expect(json.words).toEqual(VALID_WORDS);
  });

  it("404s an address with no selection", async () => {
    const res = await makeApp().request(`/selections/${account.address}`);
    expect(res.status).toBe(404);
  });

  it("400s an invalid address", async () => {
    const res = await makeApp().request("/selections/not-an-address");
    expect(res.status).toBe(400);
  });
});
