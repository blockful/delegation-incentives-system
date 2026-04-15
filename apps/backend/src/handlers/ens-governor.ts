import { ponder } from "ponder:registry";
import { governanceProposal, governanceVote } from "ponder:schema";

// ─── ProposalCreated ────────────────────────────────────────────────────────

export async function handleProposalCreated(event: any, context: any) {
  const { db } = context;
  const { proposalId, proposer, voteStart, voteEnd, description } = event.args;
  const id = BigInt(proposalId).toString();

  await db
    .insert(governanceProposal)
    .values({
      id,
      proposer: proposer.toLowerCase(),
      startBlock: voteStart,
      endBlock: voteEnd,
      timestamp: event.block.timestamp,
      description: description.slice(0, 500),
      status: "active",
      finalizedTimestamp: null,
    })
    .onConflictDoUpdate((existing: any) => ({
      // Preserve status if already set by a later event (e.g. ProposalExecuted)
      status: existing.status,
      finalizedTimestamp: existing.finalizedTimestamp,
    }));
}

ponder.on("ENSGovernor:ProposalCreated", async ({ event, context }) => {
  await handleProposalCreated(event, context);
});

// ─── VoteCast ───────────────────────────────────────────────────────────────

export async function handleVoteCast(event: any, context: any) {
  const { db } = context;
  const { voter, proposalId, support, weight } = event.args;
  const proposalIdStr = BigInt(proposalId).toString();
  const voterAddr = voter.toLowerCase();

  await db
    .insert(governanceVote)
    .values({
      id: `${proposalIdStr}-${voterAddr}`,
      proposalId: proposalIdStr,
      voter: voterAddr,
      support,
      weight: weight.toString(),
      timestamp: event.block.timestamp,
    })
    .onConflictDoUpdate(() => ({
      support,
      weight: weight.toString(),
      timestamp: event.block.timestamp,
    }));
}

ponder.on("ENSGovernor:VoteCast", async ({ event, context }) => {
  await handleVoteCast(event, context);
});

// ─── VoteCastWithParams (same logic, extra params field ignored) ────────────

ponder.on("ENSGovernor:VoteCastWithParams", async ({ event, context }) => {
  await handleVoteCast(event, context);
});

// ─── ProposalExecuted ───────────────────────────────────────────────────────

export async function handleProposalExecuted(event: any, context: any) {
  const { db } = context;
  const { proposalId } = event.args;

  await db
    .update(governanceProposal, { id: BigInt(proposalId).toString() })
    .set({
      status: "executed",
      finalizedTimestamp: event.block.timestamp,
    });
}

ponder.on("ENSGovernor:ProposalExecuted", async ({ event, context }) => {
  await handleProposalExecuted(event, context);
});

// ─── ProposalDefeated ───────────────────────────────────────────────────────

export async function handleProposalDefeated(event: any, context: any) {
  const { db } = context;
  const { proposalId } = event.args;

  await db
    .update(governanceProposal, { id: BigInt(proposalId).toString() })
    .set({
      status: "defeated",
      finalizedTimestamp: event.block.timestamp,
    });
}

ponder.on("ENSGovernor:ProposalDefeated", async ({ event, context }) => {
  await handleProposalDefeated(event, context);
});

// ─── ProposalCanceled ───────────────────────────────────────────────────────

export async function handleProposalCanceled(event: any, context: any) {
  const { db } = context;
  const { proposalId } = event.args;

  await db
    .update(governanceProposal, { id: BigInt(proposalId).toString() })
    .set({
      status: "canceled",
      finalizedTimestamp: event.block.timestamp,
    });
}

ponder.on("ENSGovernor:ProposalCanceled", async ({ event, context }) => {
  await handleProposalCanceled(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerEnsGovernorHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
}
