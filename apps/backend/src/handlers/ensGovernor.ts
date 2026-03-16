import { ponder } from "ponder:registry"
import schema from "ponder:schema"

// ─── Canonical ID helpers ─────────────────────────────────────────────────────

function toProposalId(raw: bigint): string {
  return raw.toString()
}

function toVoteId(rawProposalId: bigint, voter: string): string {
  return `${rawProposalId.toString()}-${voter.toLowerCase()}`
}

// ─── Exported pure handler functions (used by unit tests) ────────────────────

export async function handleProposalCreated(
  event: {
    args: {
      proposalId: bigint
      proposer: string
      voteStart: bigint
      voteEnd: bigint
      description: string
    }
    block: { timestamp: bigint }
  },
  context: { db: any },
): Promise<void> {
  const { proposalId, proposer, voteStart, voteEnd, description } = event.args
  await context.db
    .insert(schema.governanceProposal)
    .values({
      id: toProposalId(proposalId),
      proposer: proposer.toLowerCase(),
      startBlock: voteStart,
      endBlock: voteEnd,
      timestamp: event.block.timestamp,
      description,
      status: "active",
    })
    .onConflictDoNothing()
}

export async function handleVoteCast(
  event: {
    args: {
      voter: string
      proposalId: bigint
      support: number
      weight: bigint
    }
    block: { timestamp: bigint }
  },
  context: { db: any },
): Promise<void> {
  const { voter, proposalId, support, weight } = event.args
  await context.db
    .insert(schema.governanceVote)
    .values({
      id: toVoteId(proposalId, voter),
      proposalId: toProposalId(proposalId),
      voter: voter.toLowerCase(),
      support,
      weight: weight.toString(),
      timestamp: event.block.timestamp,
    })
    .onConflictDoUpdate(() => ({
      weight: weight.toString(),
      timestamp: event.block.timestamp,
    }))
}

export async function handleProposalExecuted(
  event: { args: { proposalId: bigint }; block: { timestamp: bigint } },
  context: { db: any },
): Promise<void> {
  await context.db
    .update(schema.governanceProposal, { id: toProposalId(event.args.proposalId) })
    .set({ status: "executed" })
}

export async function handleProposalCanceled(
  event: { args: { proposalId: bigint }; block: { timestamp: bigint } },
  context: { db: any },
): Promise<void> {
  await context.db
    .update(schema.governanceProposal, { id: toProposalId(event.args.proposalId) })
    .set({ status: "canceled" })
}

// ─── Ponder event registrations ──────────────────────────────────────────────

export function registerEnsGovernorHandlers() {
  ponder.on("ENSGovernor:ProposalCreated", async ({ event, context }) => {
    await handleProposalCreated(event as any, context)
  })

  ponder.on("ENSGovernor:VoteCast", async ({ event, context }) => {
    await handleVoteCast(event as any, context)
  })

  ponder.on("ENSGovernor:VoteCastWithParams", async ({ event, context }) => {
    await handleVoteCast(event as any, context)
  })

  ponder.on("ENSGovernor:ProposalExecuted", async ({ event, context }) => {
    await handleProposalExecuted(event as any, context)
  })

  ponder.on("ENSGovernor:ProposalCanceled", async ({ event, context }) => {
    await handleProposalCanceled(event as any, context)
  })
}
