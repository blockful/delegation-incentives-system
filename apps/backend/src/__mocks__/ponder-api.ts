/**
 * Mock for ponder:api — exports a placeholder `db` whose type
 * is used by adapters via `typeof PonderDb`.
 *
 * In tests, adapters receive the FakePonderDb from test/doubles instead.
 */
export const db = {} as any;
