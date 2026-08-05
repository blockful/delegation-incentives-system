import { ponder } from "ponder:registry";
import {
  lockupPlan,
  lockupVotingVault,
  lockupNftOwnership,
  lockupBalanceEvent,
} from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72";

// VotingTokenLockupPlans (Hedgey "Voting Lockups").
//
// Unlike the vesting master contract (0x2CDE…, which custodies all plan tokens
// itself and delegates as a single address), each voting-enabled lockup plan
// moves its tokens into a dedicated per-plan VotingVault contract the moment
// `setupVoting`/`delegate` is first called. The VAULT is the address that
// appears as the DelegateChanged delegator on the ENS token — so vaults are
// what must be resolved to plan-NFT owners in the rewards pipeline.
//
// Vault-less plans need no delegation handling: their tokens sit inside the
// lockup contract itself, and the lockup contract never calls
// `ENSToken.delegate` on its own balance (every delegation path in the
// contract goes through a per-plan vault — see `_delegate`/`_setupVoting` in
// VotingTokenLockupPlans.sol). A plan without a vault therefore contributes
// voting power to no one and can never show up in ens_delegation_event as a
// delegator; it correctly stays out of the token-holder set until a vault is
// created and funded. We still index the plan itself from PlanCreated so that
// its state is complete when (if) a vault appears later.

// ─── PlanCreated ───────────────────────────────────────────────────────────

export async function handleLockupPlanCreated(event: any, context: any) {
  const { db } = context;
  const { id, recipient, token, amount, start, cliff, rate, period } =
    event.args;

  const tokenAddr = (token as string).toLowerCase();

  // Only index ENS token lockup plans
  if (tokenAddr !== ENS_TOKEN) return;

  const recipientAddr = (recipient as string).toLowerCase();

  await db.insert(lockupPlan).values({
    id,
    recipient: recipientAddr,
    token: tokenAddr,
    amount,
    start,
    cliff,
    rate,
    period,
    remainder: amount,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtLogIndex: event.log.logIndex,
  });

  await db.insert(lockupNftOwnership).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    owner: recipientAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingLockup:PlanCreated", async ({ event, context }) => {
  await handleLockupPlanCreated(event, context);
});

// ─── VotingVaultCreated ────────────────────────────────────────────────────

export async function handleVotingVaultCreated(event: any, context: any) {
  const { db } = context;
  const { id, vaultAddress } = event.args;
  const vaultAddr = (vaultAddress as string).toLowerCase();

  // Record the vault UNCONDITIONALLY (even when the plan row does not exist):
  // in the segmentation flow (`_segmentPlan`) the segment's VotingVaultCreated
  // is emitted BEFORE PlanSegmented mints the plan into our table, and vaults
  // of non-ENS plans are simply never joined to a plan row by the adapter.
  await db.insert(lockupVotingVault).values({
    id,
    vaultAddress: vaultAddr,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtLogIndex: event.log.logIndex,
  });

  // Tokens physically move from the lockup contract into the vault at this
  // moment (`_setupVoting` transfers the full current remainder), so this is
  // when the plan's balance starts counting toward the vault-delegated TWB.
  const plan = await db.find(lockupPlan, { id });
  if (!plan) return; // non-ENS plan, or segment flow (handled in PlanSegmented)

  await db.insert(lockupBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder: plan.remainder,
    kind: "vault_funded",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingLockup:VotingVaultCreated", async ({ event, context }) => {
  await handleVotingVaultCreated(event, context);
});

// ─── PlanRedeemed ──────────────────────────────────────────────────────────

export async function handleLockupPlanRedeemed(event: any, context: any) {
  const { db } = context;
  const { id, planRemainder } = event.args;

  // Only update if the plan exists (it won't if it was a non-ENS token plan)
  const plan = await db.find(lockupPlan, { id });
  if (!plan) return;

  await db.update(lockupPlan, { id }).set({
    remainder: planRemainder,
  });

  await db.insert(lockupBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder,
    kind: "redemption",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingLockup:PlanRedeemed", async ({ event, context }) => {
  await handleLockupPlanRedeemed(event, context);
});

// ─── PlanSegmented ─────────────────────────────────────────────────────────
//
// `segmentPlan` splits a plan in two: the original keeps `newPlanAmount`, and
// a freshly minted plan (`segmentId`) takes `segmentAmount`. If the original
// has a voting vault, the segment gets its own vault too (VotingVaultCreated
// for `segmentId` fires earlier in the same tx, before the segment plan row
// exists — see handleVotingVaultCreated).

export async function handleLockupPlanSegmented(event: any, context: any) {
  const { db } = context;
  const {
    id,
    segmentId,
    newPlanAmount,
    newPlanRate,
    segmentAmount,
    segmentRate,
    start,
    cliff,
    period,
  } = event.args;

  // Only process ENS plans (non-ENS plans were never indexed)
  const plan = await db.find(lockupPlan, { id });
  if (!plan) return;

  // Original plan: locked remainder drops to newPlanAmount
  await db.update(lockupPlan, { id }).set({
    remainder: newPlanAmount,
    rate: newPlanRate,
  });

  await db.insert(lockupBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder: newPlanAmount,
    kind: "segment",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });

  // Segment plan: minted to the original plan's current owner
  // (`_segmentPlan` requires ownerOf(planId) == msg.sender)
  await db.insert(lockupPlan).values({
    id: segmentId,
    recipient: plan.recipient,
    token: plan.token,
    amount: segmentAmount,
    start,
    cliff,
    rate: segmentRate,
    period,
    remainder: segmentAmount,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtLogIndex: event.log.logIndex,
  });

  await db.insert(lockupNftOwnership).values({
    id: `${segmentId}-${event.block.number}-${event.log.logIndex}`,
    planId: segmentId,
    owner: plan.recipient,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });

  // If the segment got its own vault earlier in this tx, record the funding
  // that handleVotingVaultCreated could not (the plan row did not exist yet).
  const segmentVault = await db.find(lockupVotingVault, { id: segmentId });
  if (segmentVault) {
    await db.insert(lockupBalanceEvent).values({
      id: `${segmentId}-${event.block.number}-${event.log.logIndex}`,
      planId: segmentId,
      planRemainder: segmentAmount,
      kind: "vault_funded",
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
    });
  }
}

ponder.on("HedgeyVotingLockup:PlanSegmented", async ({ event, context }) => {
  await handleLockupPlanSegmented(event, context);
});

// ─── PlansCombined ─────────────────────────────────────────────────────────
//
// `combinePlans` merges two same-parameter plans owned by the same holder:
// the surviving plan absorbs the other's tokens (vault-to-vault when both
// have vaults) and the other plan is deleted and its NFT burned (the burn
// Transfer fires before this event and records the 0x0 ownership row).

export async function handleLockupPlansCombined(event: any, context: any) {
  const { db } = context;
  const { id0, id1, survivingId, amount } = event.args;

  const absorbedId = survivingId === id0 ? id1 : id0;

  // Both plans share the same token on-chain, so for ENS plans both rows
  // exist; for non-ENS plans neither does.
  const surviving = await db.find(lockupPlan, { id: survivingId });
  if (surviving) {
    await db.update(lockupPlan, { id: survivingId }).set({
      remainder: amount,
    });
    await db.insert(lockupBalanceEvent).values({
      id: `${survivingId}-${event.block.number}-${event.log.logIndex}`,
      planId: survivingId,
      planRemainder: amount,
      kind: "combine",
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
    });
  }

  const absorbed = await db.find(lockupPlan, { id: absorbedId });
  if (absorbed) {
    await db.update(lockupPlan, { id: absorbedId }).set({
      remainder: 0n,
    });
    await db.insert(lockupBalanceEvent).values({
      id: `${absorbedId}-${event.block.number}-${event.log.logIndex}`,
      planId: absorbedId,
      planRemainder: 0n,
      kind: "combine",
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
    });
  }
}

ponder.on("HedgeyVotingLockup:PlansCombined", async ({ event, context }) => {
  await handleLockupPlansCombined(event, context);
});

// ─── Transfer (ERC721 — lockup plan NFT ownership) ─────────────────────────

export async function handleLockupTransfer(event: any, context: any) {
  const { db } = context;
  const { from, to, tokenId } = event.args;
  const fromAddr = (from as string).toLowerCase();
  const toAddr = (to as string).toLowerCase();

  // Skip mints — PlanCreated / PlanSegmented already set the initial owner
  if (fromAddr === ZERO_ADDRESS) return;

  // Only process if we have this plan (non-ENS plans are skipped)
  const plan = await db.find(lockupPlan, { id: tokenId });
  if (!plan) return;

  if (toAddr !== ZERO_ADDRESS) {
    // Transfer to new owner — update recipient (burns keep the last recipient
    // on the plan row; the 0x0 ownership row below records the burn)
    await db.update(lockupPlan, { id: tokenId }).set({
      recipient: toAddr,
    });
  }

  await db.insert(lockupNftOwnership).values({
    id: `${tokenId}-${event.block.number}-${event.log.logIndex}`,
    planId: tokenId,
    owner: toAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingLockup:Transfer", async ({ event, context }) => {
  await handleLockupTransfer(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerHedgeyLockupHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
  // This function exists so tests can verify the module loads cleanly.
}
