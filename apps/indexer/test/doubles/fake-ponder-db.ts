/**
 * FakePonderDb — a test double that implements the Drizzle query API
 * used by the 9 adapter classes.
 *
 * Supports the query patterns:
 *   db.select().from(tableObj).where(drizzleExpr).orderBy(drizzleExpr).limit(n)
 *   db.insert(tableObj).values(row).onConflictDoUpdate({ target, set })
 *   db.update(tableObj).set(data).where(drizzleExpr)
 *
 * Tables are identified by their _tableName property (from ponder-schema mock).
 * Rows are stored in a Map<tableName, row[]>.
 *
 * Drizzle SQL expressions are evaluated by a built-in interpreter that handles:
 *   eq, ne, inArray, and, lte, gte, gt, lt, desc, asc
 */

export type Row = Record<string, unknown>

// ─── Drizzle SQL expression interpreter ────────────────────────────────────

type SqlChunk = {
  value?: string[]
  name?: string
  queryChunks?: SqlChunk[]
} | string | bigint | number | unknown[] | null | undefined

interface DrizzleSqlExpr {
  queryChunks: SqlChunk[]
}

function toComparable(v: unknown): bigint | string | null {
  if (v === null || v === undefined) return null
  if (typeof v === "bigint") return v
  if (typeof v === "number") return BigInt(v)
  if (typeof v === "string") {
    try {
      return BigInt(v)
    } catch {
      return v
    }
  }
  return null
}

function evalDrizzleExpr(expr: DrizzleSqlExpr | undefined | null, row: Row): boolean {
  if (!expr || !expr.queryChunks) return true
  const chunks = expr.queryChunks

  // Case 1: and/or wrapper → outer chunks = [sql('('), nested, sql(')')]
  // nested.queryChunks = [subExpr, sql('and'|'or'), subExpr, ...]
  const nestedChunks = chunks.filter(
    (c): c is DrizzleSqlExpr => typeof c === "object" && c !== null && !Array.isArray(c) && "queryChunks" in (c as object),
  )
  if (nestedChunks.length === 1) {
    const inner = (nestedChunks[0] as DrizzleSqlExpr).queryChunks
    const hasAnd = inner.some(
      (c) => typeof c === "object" && c !== null && !Array.isArray(c) && (c as any).value?.[0]?.trim() === "and",
    )
    const hasOr = inner.some(
      (c) => typeof c === "object" && c !== null && !Array.isArray(c) && (c as any).value?.[0]?.trim() === "or",
    )
    if (hasAnd || hasOr) {
      const subExprs = inner.filter(
        (c): c is DrizzleSqlExpr =>
          typeof c === "object" && c !== null && !Array.isArray(c) && "queryChunks" in (c as object),
      )
      return hasAnd
        ? subExprs.every((sub) => evalDrizzleExpr(sub, row))
        : subExprs.some((sub) => evalDrizzleExpr(sub, row))
    }
  }

  // Case 2: simple comparison
  const colChunk = chunks.find(
    (c): c is { name: string } =>
      typeof c === "object" && c !== null && !Array.isArray(c) && "name" in (c as object),
  )
  if (!colChunk) return true

  const colName = colChunk.name
  const rowVal = row[colName]
  const rowComp = toComparable(rowVal)

  const sqlOps = chunks
    .filter(
      (c): c is { value: string[] } =>
        typeof c === "object" && c !== null && !Array.isArray(c) && "value" in (c as object) && (c as any).value?.[0]?.trim() !== "",
    )
    .map((c) => (c as { value: string[] }).value[0].trim())
  const op = sqlOps[0]

  // inArray
  if (op === "in") {
    const arrChunk = chunks.find((c): c is unknown[] => Array.isArray(c))
    if (arrChunk) return (arrChunk as unknown[]).includes(rowVal)
  }

  // Find value after column chunk
  const colIdx = chunks.indexOf(colChunk)
  const valueChunk = chunks
    .slice(colIdx + 1)
    .find((c) => typeof c === "string" || typeof c === "bigint" || typeof c === "number")
  const valComp = toComparable(valueChunk)

  if (op === "<>" || op === "!=") return rowVal !== valueChunk || rowComp !== valComp
  if (op === "=") return rowVal === valueChunk || rowComp === valComp
  if (op === "<=") return rowComp !== null && valComp !== null && rowComp <= valComp
  if (op === ">=") return rowComp !== null && valComp !== null && rowComp >= valComp
  if (op === ">") return rowComp !== null && valComp !== null && rowComp > valComp
  if (op === "<") return rowComp !== null && valComp !== null && rowComp < valComp

  return true
}

function evalDrizzleOrder(
  expr: DrizzleSqlExpr | undefined | null,
  a: Row,
  b: Row,
): number {
  if (!expr || !expr.queryChunks) return 0
  const chunks = expr.queryChunks

  const colChunk = chunks.find(
    (c): c is { name: string } =>
      typeof c === "object" && c !== null && !Array.isArray(c) && "name" in (c as object),
  )
  if (!colChunk) return 0

  const colName = colChunk.name
  const isDesc = chunks.some(
    (c) =>
      typeof c === "object" && c !== null && !Array.isArray(c) && (c as any).value?.[0]?.includes("desc"),
  )

  const av = a[colName]
  const bv = b[colName]

  let cmp = 0
  if (typeof av === "bigint" && typeof bv === "bigint") {
    cmp = av < bv ? -1 : av > bv ? 1 : 0
  } else {
    const ac = toComparable(av)
    const bc = toComparable(bv)
    if (ac !== null && bc !== null) {
      cmp = ac < bc ? -1 : ac > bc ? 1 : 0
    } else {
      cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
    }
  }

  return isDesc ? -cmp : cmp
}

// ─── Extract table name from table object or string ─────────────────────────

function resolveTableName(table: unknown): string {
  if (typeof table === "string") return table
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

// ─── Fluent select builder ───────────────────────────────────────────────────

class FakeSelectBuilder {
  private _table: string | null = null
  private _whereExpr: DrizzleSqlExpr | null = null
  private _orderExprs: DrizzleSqlExpr[] = []
  private _limitVal: number | null = null

  constructor(private store: Map<string, Row[]>) {}

  from(table: unknown): this {
    this._table = resolveTableName(table)
    return this
  }

  where(expr: DrizzleSqlExpr | null | undefined): this {
    this._whereExpr = expr ?? null
    return this
  }

  orderBy(...exprs: (DrizzleSqlExpr | null | undefined)[]): this {
    this._orderExprs = exprs.filter((e): e is DrizzleSqlExpr => e != null)
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

    if (this._whereExpr) {
      rows = rows.filter((r) => evalDrizzleExpr(this._whereExpr, r))
    }

    if (this._orderExprs.length > 0) {
      rows = rows.sort((a, b) => {
        for (const expr of this._orderExprs) {
          const cmp = evalDrizzleOrder(expr, a, b)
          if (cmp !== 0) return cmp
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

class FakeInsertValuesBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
    private row: Row,
  ) {}

  onConflictDoUpdate(opts: { target?: unknown; set?: Partial<Row> } | Partial<Row>): Row {
    const rows = this.store.get(this.table) ?? []
    const updateData = (opts && typeof opts === "object" && "set" in opts && opts.set)
      ? opts.set
      : (opts as Partial<Row>)

    // Determine primary key: "month" if no "id", otherwise "id"
    const effectivePk: string =
      "month" in this.row && !("id" in this.row) ? "month" : "id"

    const idx = rows.findIndex((r) => r[effectivePk] === this.row[effectivePk])
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...updateData }
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
    const effectivePk: string =
      "month" in this.row && !("id" in this.row) ? "month" : "id"
    if (!rows.find((r) => r[effectivePk] === this.row[effectivePk])) {
      rows.push({ ...this.row })
      this.store.set(this.table, rows)
    }
  }
}

class FakeInsertBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
  ) {}

  values(row: Row): FakeInsertValuesBuilder {
    return new FakeInsertValuesBuilder(this.store, this.table, row)
  }
}

// ─── Update builder ──────────────────────────────────────────────────────────

class FakeUpdateSetBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
    private data: Partial<Row>,
  ) {}

  where(expr: DrizzleSqlExpr | null | undefined): void {
    const rows = this.store.get(this.table) ?? []
    const updated = rows.map((r) =>
      evalDrizzleExpr(expr ?? null, r) ? { ...r, ...this.data } : r,
    )
    this.store.set(this.table, updated)
  }
}

class FakeUpdateBuilder {
  constructor(
    private store: Map<string, Row[]>,
    private table: string,
  ) {}

  set(data: Partial<Row>): FakeUpdateSetBuilder {
    return new FakeUpdateSetBuilder(this.store, this.table, data)
  }
}

// ─── FakePonderDb ─────────────────────────────────────────────────────────────

export class FakePonderDb {
  /** Pre-seeded data, accessible from tests for inspection */
  readonly store: Map<string, Row[]>

  constructor(seed: Record<string, Row[]> = {}) {
    this.store = new Map(
      Object.entries(seed).map(([k, v]) => [k, [...v.map((r) => ({ ...r }))]]),
    )
  }

  select(): FakeSelectBuilder {
    return new FakeSelectBuilder(this.store)
  }

  insert(table: unknown): FakeInsertBuilder {
    const tableName = resolveTableName(table)
    if (!this.store.has(tableName)) {
      this.store.set(tableName, [])
    }
    return new FakeInsertBuilder(this.store, tableName)
  }

  update(table: unknown): FakeUpdateBuilder {
    const tableName = resolveTableName(table)
    return new FakeUpdateBuilder(this.store, tableName)
  }
}
