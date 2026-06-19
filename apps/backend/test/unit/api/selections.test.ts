import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { privateKeyToAccount } from "viem/accounts";
import { buildSelectionMessage, scoreSelection, STRONG_MATCH_THRESHOLD } from "@ens-dis/domain";
import { WORD_POOL, validateSelection } from "../../../src/api/matchmaking/word-pool.js";

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
      from: () => {
        const all = () => Promise.resolve([...store.values()]);
        // Thenable: awaited directly → all rows; .where().limit(n) → first n.
        // (Predicate ignored; tests insert the row under test first so
        // .limit(1) returns it.)
        return {
          where: () => ({
            limit: (n: number) =>
              Promise.resolve([...store.values()].slice(0, n)),
          }),
          then: (
            resolve: (rows: unknown[]) => void,
            reject: (e: unknown) => void,
          ) => all().then(resolve, reject),
        };
      },
    }),
  };
  return { store, fakeDb };
});

vi.mock("../../../src/db/app-tables.js", () => ({
  getAppDb: () => ({ db: fakeDb, ready: Promise.resolve() }),
  wordSelections: { address: "address" },
}));

// Mock only fetchActiveVoters; keep normalizeAddress (and the rest) real.
const { fetchActiveVotersMock } = vi.hoisted(() => ({
  fetchActiveVotersMock: vi.fn(),
}));
vi.mock("../../../src/api/helpers.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../../../src/api/helpers.js");
  return { ...actual, fetchActiveVoters: fetchActiveVotersMock };
});

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

function put(address: string, body: unknown) {
  return makeApp().request(`/selections/${address}`, {
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

describe("PUT /selections/{address}", () => {
  it("stores a selection with a valid signature from the same address", async () => {
    const signature = await account.signMessage({
      message: buildSelectionMessage(account.address, VALID_WORDS),
    });

    const res = await put(account.address, { words: VALID_WORDS, signature });
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

    const res = await put(account.address, { words: VALID_WORDS, signature });
    expect(res.status).toBe(401);
    expect(store.size).toBe(0);
  });

  it("rejects when the words are tampered after signing (401)", async () => {
    const signature = await account.signMessage({
      message: buildSelectionMessage(account.address, VALID_WORDS),
    });
    const tampered = ["security", "decentralization", "public_goods_funding", "transparency", "accessibility"];

    const res = await put(account.address, { words: tampered, signature });
    expect(res.status).toBe(401);
    expect(store.size).toBe(0);
  });

  it("rejects a malformed signature (401)", async () => {
    const res = await put(account.address, { words: VALID_WORDS, signature: "0xdeadbeef" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid selection before checking the signature (400)", async () => {
    const res = await put(account.address, {
      words: VALID_WORDS.slice(0, 4),
      signature: "0xdeadbeef",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid address (400)", async () => {
    const res = await put("not-an-address", { words: VALID_WORDS, signature: "0xdeadbeef" });
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

describe("GET /selections/word-pool", () => {
  it("returns the pool as {id, label} entries (public, no auth)", async () => {
    const res = await makeApp().request("/selections/word-pool");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { pool: { id: string; label: string }[] };
    expect(json.pool).toHaveLength(WORD_POOL.length);
    expect(
      json.pool.every((w) => typeof w.id === "string" && typeof w.label === "string"),
    ).toBe(true);
    expect(json.pool.map((w) => w.id)).toContain("decentralization");
  });

  it("does not collide with GET /selections/{address}", async () => {
    // 'word-pool' is a static path and must out-rank the {address} param route.
    const res = await makeApp().request("/selections/word-pool");
    expect(res.status).toBe(200);
  });
});

describe("scoreSelection", () => {
  it("scores full overlap as 100% strong match", () => {
    const s = scoreSelection(VALID_WORDS, VALID_WORDS);
    expect(s.percent).toBe(100);
    expect(s.strongMatch).toBe(true);
    expect(s.sharedWords).toEqual(VALID_WORDS);
    expect(s.aUnique).toEqual([]);
    expect(s.bUnique).toEqual([]);
  });

  it("4 of 5 shared = 80% = strong (threshold), with shared/unique split", () => {
    const b = ["security", "decentralization", "public_goods_funding", "transparency", "accessibility"];
    const s = scoreSelection(VALID_WORDS, b);
    expect(s.percent).toBe(STRONG_MATCH_THRESHOLD);
    expect(s.strongMatch).toBe(true);
    expect(s.sharedWords).toHaveLength(4);
    expect(s.aUnique).toEqual(["open_source"]);
    expect(s.bUnique).toEqual(["accessibility"]);
  });

  it("3 of 5 shared = 60% = not strong", () => {
    const b = ["security", "decentralization", "public_goods_funding", "self_custody", "accessibility"];
    const s = scoreSelection(VALID_WORDS, b);
    expect(s.percent).toBe(60);
    expect(s.strongMatch).toBe(false);
  });

  it("an empty other side scores 0", () => {
    const s = scoreSelection(VALID_WORDS, []);
    expect(s.percent).toBe(0);
    expect(s.strongMatch).toBe(false);
  });
});

describe("GET /selections/{address}/match-count", () => {
  const self = account.address.toLowerCase();
  const voter = "0x1111111111111111111111111111111111111111";
  const holder = "0x2222222222222222222222222222222222222222";
  const weak = "0x3333333333333333333333333333333333333333";
  const strongWords = ["security", "decentralization", "public_goods_funding", "transparency", "accessibility"];

  beforeEach(() => {
    fetchActiveVotersMock.mockResolvedValue({ activeVoters: new Set([voter]) });
  });

  it("counts strong matches and splits out active voters", async () => {
    // Insert self FIRST so the own-selection lookup (.limit(1)) returns it.
    store.set(self, { address: self, words: VALID_WORDS, createdAt: 1n, updatedAt: 1n });
    store.set(voter, { address: voter, words: strongWords, createdAt: 1n, updatedAt: 1n }); // strong + active voter
    store.set(holder, { address: holder, words: strongWords, createdAt: 1n, updatedAt: 1n }); // strong, not a voter
    store.set(weak, {
      address: weak,
      words: ["security", "decentralization", "self_custody", "accessibility", "sustainability"],
      createdAt: 1n,
      updatedAt: 1n,
    }); // 2/5 = weak

    const res = await makeApp().request(`/selections/${account.address}/match-count`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { matchCount: number; matchingActiveVoters: number };
    expect(json.matchCount).toBe(2);
    expect(json.matchingActiveVoters).toBe(1);
  });

  it("returns zeros when the address has no selection", async () => {
    const res = await makeApp().request(`/selections/${account.address}/match-count`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ matchCount: 0, matchingActiveVoters: 0 });
  });

  it("400s an invalid address", async () => {
    const res = await makeApp().request("/selections/not-an-address/match-count");
    expect(res.status).toBe(400);
  });
});
