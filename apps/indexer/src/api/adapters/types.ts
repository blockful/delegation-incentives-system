/**
 * PonderDb — the minimal database interface that all 9 adapters depend on.
 *
 * FakePonderDb (test double) implements this directly.
 * RealPonderDb (production) wraps db.sql (Drizzle NodePgDatabase).
 *
 * Predicates are plain functions (row) => boolean so adapters can be tested
 * without importing drizzle-orm operators.
 */

export type Row = Record<string, unknown>
export type Predicate = (row: Row) => boolean
export type OrderSpec = { field: string; dir: "asc" | "desc" }

export interface SelectBuilder<T = Row> {
  from(table: string): SelectBuilder<T>
  where(pred: Predicate): SelectBuilder<T>
  orderBy(...specs: OrderSpec[]): SelectBuilder<T>
  limit(n: number): SelectBuilder<T>
  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>
}

export interface InsertValuesBuilder {
  onConflictDoUpdate(
    updateFnOrData: ((existing: Row) => Partial<Row>) | Partial<Row>,
  ): unknown
  onConflictDoNothing(): void
}

export interface InsertBuilder {
  values(row: Row): InsertValuesBuilder
}

export interface UpdateSetBuilder {
  where(pred: Predicate): void
}

export interface UpdateBuilder {
  set(data: Partial<Row>): UpdateSetBuilder
}

export interface PonderDb {
  select(): SelectBuilder
  insert(table: string): InsertBuilder
  update(table: string): UpdateBuilder
}
