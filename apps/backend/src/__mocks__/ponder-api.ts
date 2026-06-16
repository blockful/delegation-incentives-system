/**
 * Mock for ponder:api — exports a placeholder `db` whose type
 * is used by adapters via `typeof PonderDb`.
 *
 * In tests, adapters receive the FakePonderDb from test/doubles instead.
 */
export const db = {} as any;

/**
 * Mock for ponder:api `publicClients`. The default finalized-head fetcher in
 * distribution-scheduler reads `publicClients.mainnet`; unit tests inject their
 * own `getFinalizedTimestamp`, so this stub only needs to exist (mainnet is
 * intentionally absent — any test that forgets to inject will fail loudly).
 */
export const publicClients = { mainnet: undefined } as any;
