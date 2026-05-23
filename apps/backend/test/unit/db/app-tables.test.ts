import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unsafe = vi.fn(async () => undefined);
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

describe("app-tables / getAppDb", () => {
  beforeEach(() => {
    postgresFactory.mockClear();
    drizzleFactory.mockClear();
    unsafe.mockClear();
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

    expect(unsafe).toHaveBeenCalledTimes(1);
  });

  it("runs CREATE TABLE IF NOT EXISTS for both app-owned tables in public", async () => {
    const { ready } = getAppDb();
    await ready;

    expect(unsafe).toHaveBeenCalledTimes(1);
    const sqlText = unsafe.mock.calls[0]![0] as string;
    expect(sqlText).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.wallet_alias/i,
    );
    expect(sqlText).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.distribution_result/i,
    );
  });

  it("throws when DATABASE_URL is not set", () => {
    delete process.env.DATABASE_URL;
    expect(() => getAppDb()).toThrow(/DATABASE_URL/);
    expect(postgresFactory).not.toHaveBeenCalled();
  });
});
