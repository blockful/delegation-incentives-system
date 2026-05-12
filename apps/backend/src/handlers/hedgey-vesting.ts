import { ponder } from "ponder:registry";
import {
  vestingPlan,
  vestingNftOwnership,
  vestingRedemption,
  protocolMapping,
} from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72";
const HEDGEY_VESTING_ADDRESS = "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";

// ─── PlanCreated ───────────────────────────────────────────────────────────

export async function handlePlanCreated(event: any, context: any) {
  const { db } = context;
  const { id, recipient, token, amount, start, cliff, rate, period } =
    event.args;

  const tokenAddr = (token as string).toLowerCase();

  // Only index ENS token vesting plans
  if (tokenAddr !== ENS_TOKEN) return;

  const recipientAddr = (recipient as string).toLowerCase();

  await db.insert(vestingPlan).values({
    id,
    recipient: recipientAddr,
    token: tokenAddr,
    amount,
    start,
    cliff,
    rate,
    period,
    amountRedeemed: 0n,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtLogIndex: event.log.logIndex,
  });

  await db.insert(vestingNftOwnership).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    owner: recipientAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });

  // Create protocol mapping for deduplication
  await db
    .insert(protocolMapping)
    .values({
      id: `hedgey_vesting-${id}`,
      childAddress: HEDGEY_VESTING_ADDRESS,
      operatorAddress: recipientAddr,
      protocol: "hedgey_vesting",
    })
    .onConflictDoNothing();
}

ponder.on("HedgeyVesting:PlanCreated", async ({ event, context }) => {
  await handlePlanCreated(event, context);
});

// ─── PlanRedeemed ──────────────────────────────────────────────────────────

export async function handlePlanRedeemed(event: any, context: any) {
  const { db } = context;
  const { id, amountRedeemed, planRemainder } = event.args;

  // Only update if the plan exists (it won't if it was a non-ENS token plan)
  const plan = await db.find(vestingPlan, { id });
  if (!plan) return;

  // Update running total on the plan
  await db.update(vestingPlan, { id }).set({
    amountRedeemed: plan.amountRedeemed + amountRedeemed,
  });

  // Insert redemption event record
  await db.insert(vestingRedemption).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    amountRedeemed,
    planRemainder,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVesting:PlanRedeemed", async ({ event, context }) => {
  await handlePlanRedeemed(event, context);
});

// ─── Transfer (ERC721 — vesting plan NFT ownership) ────────────────────────

export async function handleHedgeyTransfer(event: any, context: any) {
  const { db } = context;
  const { from, to, tokenId } = event.args;
  const fromAddr = (from as string).toLowerCase();
  const toAddr = (to as string).toLowerCase();

  // Skip mints — PlanCreated already sets the initial recipient
  if (fromAddr === ZERO_ADDRESS) return;

  // Only process if we have this plan (non-ENS plans are skipped)
  const plan = await db.find(vestingPlan, { id: tokenId });
  if (!plan) return;

  if (toAddr === ZERO_ADDRESS) {
    // Burn — remove protocol mapping but keep the plan record
    await db.delete(protocolMapping, { id: `hedgey_vesting-${tokenId}` });
  } else {
    // Transfer to new owner — update recipient and protocol mapping
    await db.update(vestingPlan, { id: tokenId }).set({
      recipient: toAddr,
    });

    await db.update(protocolMapping, { id: `hedgey_vesting-${tokenId}` }).set({
      operatorAddress: toAddr,
    });
  }

  await db.insert(vestingNftOwnership).values({
    id: `${tokenId}-${event.block.number}-${event.log.logIndex}`,
    planId: tokenId,
    owner: toAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVesting:Transfer", async ({ event, context }) => {
  await handleHedgeyTransfer(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerHedgeyVestingHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
  // This function exists so tests can verify the module loads cleanly.
}
