/**
 * App-owned Postgres tables.
 *
 * These tables intentionally live outside the Ponder-managed schema:
 *
 * - `wallet_alias` is hand-curated by operators (see `OPERATOR.md`). Losing it
 *   on a Ponder schema rotation would erase irreplaceable operator data.
 * - `distribution_result` is the API-computed payout cache. Surviving deploys
 *   means a blue/green cutover doesn't blank the rounds page for ~60s while
 *   the scheduler refills it.
 * - `word_selections` is user-written matchmaking data (each wallet's set of
 *   chosen value words). It is NOT derivable from on-chain logs, so it must
 *   survive Ponder schema rotations — losing it would erase user input. Reads
 *   are public; writes are signature-verified (see `routes/selections.ts`).
 *
 * Ponder owns indexer state and assumes `onchainTable` rows are reproducible
 * from on-chain logs; it drops & recreates that schema on any `buildId` change
 * (see ponder/dist/esm/database/index.js:499). Putting non-derivable state in
 * Ponder's schema couples our cache and operator data to that lifecycle, which
 * is the wrong abstraction.
 *
 * The tables live in `public`, so the SQL examples in `OPERATOR.md` and the
 * unqualified `DELETE` in `scripts/force-recompute.sh` work as documented
 * regardless of what `DATABASE_SCHEMA` Ponder is using.
 *
 * Schema is created lazily via `CREATE TABLE IF NOT EXISTS` on first access.
 * That's idempotent, safe to race across replicas, and avoids introducing
 * drizzle-kit migration tooling for two simple tables. When the shape needs
 * to evolve beyond add-only columns, graduate to real migrations.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { bigint, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import postgres from "postgres";

// Tables live in the default Postgres schema (`public`). Drizzle's `pgTable`
// emits unqualified identifiers; the connection's `search_path` is pinned to
// `public` below so they always resolve there regardless of the role's
// default search_path.
export const walletAlias = pgTable("wallet_alias", {
  secondaryAddress: text("secondary_address").primaryKey(),
  primaryAddress: text("primary_address").notNull(),
  source: text("source").notNull(),
});

export const distributionResult = pgTable("distribution_result", {
  month: text("month").primaryKey(),
  resultJson: text("result_json").notNull(),
  computedAt: bigint("computed_at", { mode: "bigint" }).notNull(),
});

export const wordSelections = pgTable("word_selections", {
  // Lowercased 0x address — one selection per wallet.
  address: text("address").primaryKey(),
  // Unordered set of word ids (a JSON array). Ordering is not meaningful.
  words: jsonb("words").$type<string[]>().notNull(),
  createdAt: bigint("created_at", { mode: "bigint" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "bigint" }).notNull(),
});

export interface AppDbHandle {
  /** Drizzle client bound to the app-owned pool. */
  db: ReturnType<typeof drizzle>;
  /** Resolves once `CREATE TABLE IF NOT EXISTS` has run for this process. */
  ready: Promise<void>;
}

let pool: ReturnType<typeof postgres> | null = null;
let bootstrap: Promise<void> | null = null;

export function getAppDb(): AppDbHandle {
  if (!pool) pool = createPool();
  if (!bootstrap) {
    // If bootstrap rejects (transient DB outage, role race during deploy),
    // clear the cached promise so the next caller retries instead of
    // re-throwing the same error until the process restarts.
    bootstrap = ensureSchema(pool).catch((err) => {
      bootstrap = null;
      throw err;
    });
  }
  return { db: drizzle(pool), ready: bootstrap };
}

function createPool(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to access app-owned tables");
  }
  // max=2 covers the scheduler's single writer plus a concurrent API reader.
  // Pin search_path to `public` so unqualified table identifiers always resolve
  // there, regardless of the role's default search_path.
  return postgres(url, {
    max: 2,
    connection: { search_path: "public" },
  });
}

async function ensureSchema(sql: ReturnType<typeof postgres>): Promise<void> {
  // Skip the CREATE entirely when both tables already exist. This lets
  // hardened deployments (Postgres 15+ where the app role lacks CREATE on
  // `public`) work as long as the tables are pre-created by ops/migrations.
  // `to_regclass` only reads system catalogs and needs no special privilege.
  const rows = (await sql.unsafe(`
    select (
      to_regclass('public.wallet_alias') is not null
      and to_regclass('public.distribution_result') is not null
      and to_regclass('public.word_selections') is not null
    ) as ready
  `)) as Array<{ ready: boolean }>;
  if (rows[0]?.ready) return;

  await sql.unsafe(`
    create table if not exists public.wallet_alias (
      secondary_address text primary key,
      primary_address   text not null,
      source            text not null
    );
    create table if not exists public.distribution_result (
      month        text primary key,
      result_json  text not null,
      computed_at  bigint not null
    );
    create table if not exists public.word_selections (
      address    text primary key,
      words      jsonb not null,
      created_at bigint not null,
      updated_at bigint not null
    );
  `);
}

/**
 * Test-only: drop the cached pool and bootstrap promise so suites can swap
 * mocks between cases without leaking connections.
 */
export function __resetAppDbForTests(): void {
  pool = null;
  bootstrap = null;
}
