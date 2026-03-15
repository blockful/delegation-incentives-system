/**
 * FakePonderDb — a minimal test double that implements PonderDb.
 *
 * Supports the query patterns used by the 9 adapter classes:
 *   db.select().from(table).where(pred).orderBy(...specs).limit(n)
 *   db.insert(table).values(row).onConflictDoUpdate(updateFnOrData)
 *   db.update(table).set(data).where(pred)
 *
 * Tables are identified by their string name (matching ponder-schema mock).
 * Rows are stored in a Map<tableName, row[]>.
 *
 * Predicates are plain functions (row) => boolean — same as PonderDb interface.
 */

import type {
  PonderDb,
  Row,
  Predicate,
  OrderSpec,
  SelectBuilder,
  InsertBuilder,
  InsertValuesBuilder,
  UpdateBuilder,
  UpdateSetBuilder,
} from "../../src/api/adapters/types.js"

// ─── Fluent select builder ───────────────────────────────────────────────────

class FakeSelectBuilder implements SelectBuilder {
  private _table: string | null = null
  private _predicate: Predicate | null = null
  private _orderSpecs: OrderSpec[] = []
  private _limitVal: number | null = null

  constructor(private store: Map<string, Row[]>) {}

  from(table: string): this {
    this._table = table
    return this
  }

  where(pred: Predicate): this {
    this._predicate = pred
    return this
  }

  orderBy(...specs: OrderSpec[]): this {
    this._orderSpecs = specs
    return this
  }

  limit(n: number): this {
    this._limitVal = n
    return this
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this._execute()).then(onfulfilled, onrejected)
  }

  private _execute(): Row[] {
    if (!this._table) return []
    let rows = [...(this.store.get(this._table) ?? [])]

    if (this._predicate) {
      rows = rows.filter(this._predicate)
    }

    if (this._orderSpecs.length > 0) {
      rows = rows.sort((a, b) => {
        for (const spec of this._orderSpecs) {
          const av = a[spec.field]
          const bv = b[spec.field]
          let cmp = 0
          if (typeof av === "bigint" && typeof bv === "bigint") {
            cmp = av < bv ? -1 : av > bv ? 1 : 0
          } else {
            cmp = (av as string) < (bv as string) ? -1 : (av as string) > (bv as string) ? 1 : 0
          }
          if (cmp !== 0) return spec.dir === "asc" ? cmp : -cmp
        }
        return 0
      })
    }

    if (this._limitVal !== null) {
      rows = rows.slice(0, this._limitVal)
    }

    return rows
  }
}

// ─── Insert builder ──────────────────────────────────────────────────────────

class FakeInsertValuesBuilder implements InsertValuesBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
    private row: Row,
  ) {}

  onConflictDoUpdate(
    updateFnOrData: ((existing: Row) => Partial<Row>) | Partial<Row>,
  ): Row {
    const rows = this.store.get(this.table) ?? []
    // Use "id" as PK if present, otherwise first key
    const pkField = ("id" in this.row ? "id" : Object.keys(this.row)[0]) as string

    // For distribution_result, PK is "month"
    const pk = pkField === "id" || !(this.row["month"])
      ? pkField
      : "month"

    const effectivePk = ("month" in this.row && !("id" in this.row)) ? "month" : pkField

    const idx = rows.findIndex((r) => r[effectivePk] === this.row[effectivePk])
    if (idx >= 0) {
      const update =
        typeof updateFnOrData === "function"
          ? updateFnOrData(rows[idx])
          : updateFnOrData
      rows[idx] = { ...rows[idx], ...update }
      this.store.set(this.table, rows)
      return rows[idx]
    } else {
      const newRow = { ...this.row }
      rows.push(newRow)
      this.store.set(this.table, rows)
      return newRow
    }
  }

  onConflictDoNothing(): void {
    const rows = this.store.get(this.table) ?? []
    const effectivePk = ("month" in this.row && !("id" in this.row)) ? "month" : "id"
    if (!rows.find((r) => r[effectivePk] === this.row[effectivePk])) {
      rows.push({ ...this.row })
      this.store.set(this.table, rows)
    }
  }
}

class FakeInsertBuilder implements InsertBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
  ) {}

  values(row: Row): InsertValuesBuilder {
    return new FakeInsertValuesBuilder(this.store, this.table, row)
  }
}

// ─── Update builder ──────────────────────────────────────────────────────────

class FakeUpdateSetBuilder implements UpdateSetBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
    private data: Partial<Row>,
  ) {}

  where(pred: Predicate): void {
    const rows = this.store.get(this.table) ?? []
    const updated = rows.map((r) => (pred(r) ? { ...r, ...this.data } : r))
    this.store.set(this.table, updated)
  }
}

class FakeUpdateBuilder implements UpdateBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
  ) {}

  set(data: Partial<Row>): UpdateSetBuilder {
    return new FakeUpdateSetBuilder(this.store, this.table, data)
  }
}

// ─── FakePonderDb ─────────────────────────────────────────────────────────────

export class FakePonderDb implements PonderDb {
  /** Pre-seeded data, accessible from tests for inspection */
  readonly store: Map<string, Row[]>

  constructor(seed: Record<string, Row[]> = {}) {
    this.store = new Map(
      Object.entries(seed).map(([k, v]) => [k, [...v.map((r) => ({ ...r }))]])
    )
  }

  select(): SelectBuilder {
    return new FakeSelectBuilder(this.store)
  }

  insert(table: string): InsertBuilder {
    if (!this.store.has(table)) {
      this.store.set(table, [])
    }
    return new FakeInsertBuilder(this.store, table)
  }

  update(table: string): UpdateBuilder {
    return new FakeUpdateBuilder(this.store, table)
  }
}

// ─── Convenience predicate helpers (for tests) ────────────────────────────────

export function eq(field: string, value: unknown): Predicate {
  return (row: Row) => row[field] === value
}

export function inArray(field: string, values: unknown[]): Predicate {
  const set = new Set(values)
  return (row: Row) => set.has(row[field])
}

export function and(...preds: Predicate[]): Predicate {
  return (row: Row) => preds.every((p) => p(row))
}
