import { describe, it, expect, beforeEach } from "vitest"
import {
  handleProposalCreated,
  handleVoteCast,
  handleProposalExecuted,
  handleProposalDefeated,
  handleProposalCanceled,
} from "../../src/handlers/ensGovernor.js"

// ─── Fake DB ─────────────────────────────────────────────────────────────────
//
// Mimics the Ponder db API used by the handlers.
//
// In the test environment, ponder:schema is aliased to __mocks__/ponder-schema.ts
// which exports each table as its string name (e.g. "governance_proposal").
// That means context.db.insert(schema.governanceProposal) calls insert("governance_proposal").
//
// Supported patterns:
//   db.insert(table).values(row).onConflictDoUpdate(fn)  — upsert via callback
//   db.update(table, { id }).set(data)                   — positional update

function resolveTableName(table: unknown): string {
  if (typeof table === "string") return table
  if (typeof table === "object" && table !== null && "_tableName" in table) {
    return (table as { _tableName: string })._tableName
  }
  return String(table)
}

function makeFakeDb() {
  const proposals = new Map<string, any>()
  const votes = new Map<string, any>()

  function storeFor(table: unknown) {
    const name = resolveTableName(table)
    if (name === "governance_proposal") return proposals
    if (name === "governance_vote") return votes
    throw new Error(`Unknown table in fake db: ${name}`)
  }

  const db = {
    insert(table: unknown) {
      return {
        values(row: any) {
          return {
            onConflictDoUpdate(fn: (existing: any) => any) {
              const store = storeFor(table)
              const key = row.id
              const existing = store.get(key)
              if (existing) {
                store.set(key, { ...existing, ...fn(existing) })
              } else {
                store.set(key, { ...row })
              }
            },
            onConflictDoNothing() {
              const store = storeFor(table)
              if (!store.has(row.id)) store.set(row.id, { ...row })
            },
          }
        },
      }
    },
    update(table: unknown, where: { id: string }) {
      return {
        set(data: any) {
          const store = storeFor(table)
          const existing = store.get(where.id)
          if (existing) {
            store.set(where.id, { ...existing, ...data })
          }
        },
      }
    },
  }

  return { proposals, votes, db }
}

function makeContext(db: ReturnType<typeof makeFakeDb>["db"]) {
  return { db } as any
}

// ─── ProposalCreated ─────────────────────────────────────────────────────────

describe("ENSGovernor:ProposalCreated", () => {
  let store: ReturnType<typeof makeFakeDb>

  beforeEach(() => {
    store = makeFakeDb()
  })

  it("inserts a governance_proposal row with correct fields", async () => {
    const proposalId = 12345n
    const event = {
      args: {
        proposalId,
        proposer: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        targets: [],
        values: [],
        signatures: [],
        calldatas: [],
        voteStart: 14000000n,
        voteEnd: 14050000n,
        description: "Proposal to do something",
      },
      block: { timestamp: 1680000000n },
    }

    await handleProposalCreated(event as any, makeContext(store.db))

    expect(store.proposals.size).toBe(1)
    const row = store.proposals.get(proposalId.toString())
    expect(row).toBeDefined()
    expect(row.id).toBe(proposalId.toString())
    expect(row.proposer).toBe("0xabcdef1234567890abcdef1234567890abcdef12")
    expect(row.startBlock).toBe(14000000n)
    expect(row.endBlock).toBe(14050000n)
    expect(row.timestamp).toBe(1680000000n)
    expect(row.description).toBe("Proposal to do something")
    expect(row.status).toBe("active")
  })

  it("ProposalCreated replay after ProposalExecuted does not reset status to active", async () => {
    const proposalId = 99999n
    const createEvent = {
      args: {
        proposalId,
        proposer: "0x1111111111111111111111111111111111111111",
        targets: [],
        values: [],
        signatures: [],
        calldatas: [],
        voteStart: 14000000n,
        voteEnd: 14050000n,
        description: "Test proposal",
      },
      block: { timestamp: 1680000000n },
    }
    const executeEvent = { args: { proposalId }, block: { timestamp: 1680010000n } }

    // Insert ProposalCreated → status = "active"
    await handleProposalCreated(createEvent as any, makeContext(store.db))
    expect(store.proposals.get(proposalId.toString()).status).toBe("active")

    // Insert ProposalExecuted → status = "executed"
    await handleProposalExecuted(executeEvent as any, makeContext(store.db))
    expect(store.proposals.get(proposalId.toString()).status).toBe("executed")

    // Insert ProposalCreated again (replay) → status must still be "executed"
    await handleProposalCreated(createEvent as any, makeContext(store.db))
    expect(store.proposals.get(proposalId.toString()).status).toBe("executed")
  })
})

// ─── VoteCast ────────────────────────────────────────────────────────────────

describe("ENSGovernor:VoteCast", () => {
  let store: ReturnType<typeof makeFakeDb>

  beforeEach(() => {
    store = makeFakeDb()
  })

  it("inserts a governance_vote row with correct fields", async () => {
    const proposalId = 99999n
    const voter = "0x1111111111111111111111111111111111111111"
    const event = {
      args: {
        voter,
        proposalId,
        support: 1,
        weight: 500000000000000000000n,
        reason: "",
      },
      block: { timestamp: 1680001000n },
    }

    await handleVoteCast(event as any, makeContext(store.db))

    expect(store.votes.size).toBe(1)
    const expectedId = `${proposalId.toString()}-${voter.toLowerCase()}`
    const row = store.votes.get(expectedId)
    expect(row).toBeDefined()
    expect(row.id).toBe(expectedId)
    expect(row.proposalId).toBe(proposalId.toString())
    expect(row.voter).toBe(voter.toLowerCase())
    expect(row.support).toBe(1)
    expect(row.weight).toBe("500000000000000000000")
    expect(row.timestamp).toBe(1680001000n)
  })

  it("inserts vote with support=0 (Against)", async () => {
    const event = {
      args: {
        voter: "0x2222222222222222222222222222222222222222",
        proposalId: 1n,
        support: 0,
        weight: 100n,
        reason: "",
      },
      block: { timestamp: 1n },
    }
    await handleVoteCast(event as any, makeContext(store.db))
    const row = store.votes.get(`1-0x2222222222222222222222222222222222222222`)
    expect(row.support).toBe(0)
  })

  it("inserts vote with support=2 (Abstain)", async () => {
    const event = {
      args: {
        voter: "0x3333333333333333333333333333333333333333",
        proposalId: 2n,
        support: 2,
        weight: 200n,
        reason: "",
      },
      block: { timestamp: 2n },
    }
    await handleVoteCast(event as any, makeContext(store.db))
    const row = store.votes.get(`2-0x3333333333333333333333333333333333333333`)
    expect(row.support).toBe(2)
  })

  it("upserts on duplicate vote (same proposalId + voter) — updates weight", async () => {
    const voter = "0x4444444444444444444444444444444444444444"
    const proposalId = 5n
    const firstEvent = {
      args: { voter, proposalId, support: 1, weight: 100n, reason: "" },
      block: { timestamp: 10n },
    }
    const secondEvent = {
      args: { voter, proposalId, support: 1, weight: 200n, reason: "" },
      block: { timestamp: 20n },
    }

    await handleVoteCast(firstEvent as any, makeContext(store.db))
    await handleVoteCast(secondEvent as any, makeContext(store.db))

    // should not have created a duplicate row
    expect(store.votes.size).toBe(1)
    const row = store.votes.get(`5-${voter.toLowerCase()}`)
    expect(row.weight).toBe("200")
    expect(row.timestamp).toBe(20n)
  })
})

// ─── VoteCastWithParams ───────────────────────────────────────────────────────

describe("ENSGovernor:VoteCastWithParams", () => {
  it("inserts a governance_vote row (identical structure to VoteCast)", async () => {
    const store = makeFakeDb()
    const event = {
      args: {
        voter: "0x5555555555555555555555555555555555555555",
        proposalId: 77n,
        support: 1,
        weight: 300n,
        reason: "",
        params: "0x",
      },
      block: { timestamp: 99n },
    }

    // handleVoteCast is reused for VoteCastWithParams
    await handleVoteCast(event as any, makeContext(store.db))

    expect(store.votes.size).toBe(1)
    const row = store.votes.get(`77-0x5555555555555555555555555555555555555555`)
    expect(row.weight).toBe("300")
  })
})

// ─── Status updates ───────────────────────────────────────────────────────────

describe("ENSGovernor:ProposalExecuted", () => {
  it("updates governance_proposal.status to 'executed'", async () => {
    const store = makeFakeDb()
    // Pre-seed a proposal
    store.proposals.set("42", { id: "42", status: "active" })

    const event = { args: { proposalId: 42n }, block: { timestamp: 0n } }
    await handleProposalExecuted(event as any, makeContext(store.db))

    expect(store.proposals.get("42").status).toBe("executed")
  })
})

describe("ENSGovernor:ProposalDefeated", () => {
  it("updates governance_proposal.status to 'defeated'", async () => {
    const store = makeFakeDb()
    store.proposals.set("43", { id: "43", status: "active" })

    const event = { args: { proposalId: 43n }, block: { timestamp: 0n } }
    await handleProposalDefeated(event as any, makeContext(store.db))

    expect(store.proposals.get("43").status).toBe("defeated")
  })
})

describe("ENSGovernor:ProposalCanceled", () => {
  it("updates governance_proposal.status to 'canceled'", async () => {
    const store = makeFakeDb()
    store.proposals.set("44", { id: "44", status: "active" })

    const event = { args: { proposalId: 44n }, block: { timestamp: 0n } }
    await handleProposalCanceled(event as any, makeContext(store.db))

    expect(store.proposals.get("44").status).toBe("canceled")
  })
})

describe("handler registration smoke tests", () => {
  it("registerEnsGovernorHandlers does not throw (ponder.on wiring)", async () => {
    const { registerEnsGovernorHandlers } = await import("../../src/handlers/ensGovernor.js")
    expect(() => registerEnsGovernorHandlers()).not.toThrow()
  })
})
