import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unsafe = vi.fn<(sql: string) => Promise<unknown>>();
const postgresFactory = vi.fn(() => ({ unsafe }));
const drizzleFactory = vi.fn((sql: unknown) => ({ __sql: sql }));

vi.mock("postgres", () => ({
  default: (...args: unknown[]) => postgresFactory(...(args as [])),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (...args: unknown[]) => drizzleFactory(...(args as [unknown])),
}));

// Import after mocks are registered.
const { __resetAppDbForTests, getAppDb } = await import(
  "../../../src/db/app-tables.js"
);

function defaultUnsafeImpl(sql: string): Promise<unknown> {
  // Existence probe returns "tables missing" so the CREATE path runs by default.
  if (/to_regclass/i.test(sql)) {
    return Promise.resolve([{ ready: false }]);
  }
  return Promise.resolve(undefined);
}

describe("app-tables / getAppDb", () => {
  beforeEach(() => {
    postgresFactory.mockClear();
    drizzleFactory.mockClear();
    unsafe.mockReset();
    unsafe.mockImplementation(defaultUnsafeImpl);
    __resetAppDbForTests();
    process.env.DATABASE_URL = "postgres://test/test";
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("opens exactly one Postgres pool across multiple calls", () => {
    getAppDb();
    getAppDb();
    getAppDb();

    expect(postgresFactory).toHaveBeenCalledTimes(1);
    expect(postgresFactory).toHaveBeenCalledWith("postgres://test/test", {
      max: 2,
      connection: { search_path: "public" },
    });
  });

  it("returns the same `ready` promise across calls (schema bootstraps once)", async () => {
    const first = getAppDb();
    const second = getAppDb();

    expect(first.ready).toBe(second.ready);
    await first.ready;
    await second.ready;

    // Two unsafe calls per bootstrap: existence probe + CREATE TABLE.
    expect(unsafe).toHaveBeenCalledTimes(2);
  });

  it("runs CREATE TABLE IF NOT EXISTS for both app-owned tables in public", async () => {
    const { ready } = getAppDb();
    await ready;

    expect(unsafe).toHaveBeenCalledTimes(2);
    const createSql = unsafe.mock.calls[1]![0] as string;
    expect(createSql).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.wallet_alias/i,
    );
    expect(createSql).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.distribution_result/i,
    );
  });

  it("skips CREATE TABLE when both tables already exist", async () => {
    unsafe.mockImplementation((sql) => {
      if (/to_regclass/i.test(sql)) {
        return Promise.resolve([{ ready: true }]);
      }
      return Promise.resolve(undefined);
    });

    const { ready } = getAppDb();
    await ready;

    expect(unsafe).toHaveBeenCalledTimes(1);
    const probedSql = unsafe.mock.calls[0]![0] as string;
    expect(probedSql).toMatch(/to_regclass/i);
    // No CREATE TABLE issued — important for hardened deployments where the
    // app role lacks CREATE privilege on `public`.
    expect(
      unsafe.mock.calls.some((call) =>
        /create\s+table/i.test(call[0] as string),
      ),
    ).toBe(false);
  });

  it("retries bootstrap after a rejected schema bootstrap", async () => {
    unsafe.mockImplementationOnce(() =>
      Promise.reject(new Error("transient db outage")),
    );

    const first = getAppDb();
    await expect(first.ready).rejects.toThrow(/transient db outage/);

    // Default impl is restored for the next call — bootstrap should retry,
    // not return the previously-rejected promise.
    const second = getAppDb();
    await expect(second.ready).resolves.toBeUndefined();
    expect(second.ready).not.toBe(first.ready);
  });

  it("throws when DATABASE_URL is not set", () => {
    delete process.env.DATABASE_URL;
    expect(() => getAppDb()).toThrow(/DATABASE_URL/);
    expect(postgresFactory).not.toHaveBeenCalled();
  });
});
