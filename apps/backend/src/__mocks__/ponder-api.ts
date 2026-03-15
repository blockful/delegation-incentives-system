// Mock for ponder:api used in unit tests.
// In production, ponder:api provides db (NodePgDatabase/Drizzle) and publicClient (viem).
// In tests, these are replaced by fakes.

import { FakePonderDb } from "../../test/doubles/fake-ponder-db.js"

export const db = new FakePonderDb()

const mockPublicClient = {
  getBlock: async (_params: unknown) => ({
    number: 0n,
    timestamp: 0n,
    mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  }),
}

export const publicClients = {
  mainnet: mockPublicClient,
}
