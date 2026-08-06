import { ponder } from "ponder:registry";
import {
  votingVestingPlan,
  votingVestingVault,
  votingVestingNftOwnership,
  votingVestingBalanceEvent,
} from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72";

// VotingTokenVestingPlans (Hedgey "Voting Vesting").
//
// The VESTING sibling of VotingTokenLockupPlans (see hedgey-lockup.ts): each
// voting-enabled plan moves its tokens into a dedicated per-plan VotingVault
// the moment `setupVoting`/`delegate` is first called, and the VAULT is the
// address that appears as the DelegateChanged delegator on the ENS token —
// so vaults are what must be resolved to plan-NFT owners in the rewards
// pipeline. Vault-less plans need no delegation handling for the same reason
// as the lockup contract: every delegation path goes through a per-plan
// vault (`_delegate`/`_setupVoting` in VotingTokenVestingPlans.sol), so a
// plan without a vault contributes voting power to no one.
//
// Differences from the lockup contract:
// - Plans are REVOCABLE by their vestingAdmin (PlanRevoked) — see the
//   handler below for the exact remainder semantics.
// - No PlanSegmented / PlansCombined (the contract has neither event), so
//   vaults are only ever created for plans that already exist; the
//   unconditional vault insert below matters only for non-ENS plans.

// ─── PlanCreated ───────────────────────────────────────────────────────────

export async function handleVotingVestingPlanCreated(event: any, context: any) {
  const { db } = context;
  const { id, recipient, token, amount, start, cliff, rate, period } =
    event.args;

  const tokenAddr = (token as string).toLowerCase();

  // Only index ENS token vesting plans
  if (tokenAddr !== ENS_TOKEN) return;

  const recipientAddr = (recipient as string).toLowerCase();

  await db.insert(votingVestingPlan).values({
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

  await db.insert(votingVestingNftOwnership).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    owner: recipientAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingVesting:PlanCreated", async ({ event, context }) => {
  await handleVotingVestingPlanCreated(event, context);
});

// ─── VotingVaultCreated ────────────────────────────────────────────────────

export async function handleVotingVestingVaultCreated(event: any, context: any) {
  const { db } = context;
  const { id, vaultAddress } = event.args;
  const vaultAddr = (vaultAddress as string).toLowerCase();

  // Record the vault UNCONDITIONALLY: vaults of non-ENS plans have no plan
  // row and are simply never joined to a plan by the adapter.
  await db.insert(votingVestingVault).values({
    id,
    vaultAddress: vaultAddr,
    createdAtBlock: event.block.number,
    createdAtTimestamp: event.block.timestamp,
    createdAtLogIndex: event.log.logIndex,
  });

  // Tokens physically move from the vesting contract into the vault at this
  // moment (`_setupVoting` transfers the plan's full current amount), so this
  // is when the plan's balance starts counting toward the vault-delegated TWB.
  const plan = await db.find(votingVestingPlan, { id });
  if (!plan) return; // non-ENS plan

  await db.insert(votingVestingBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder: plan.remainder,
    kind: "vault_funded",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingVesting:VotingVaultCreated", async ({ event, context }) => {
  await handleVotingVestingVaultCreated(event, context);
});

// ─── PlanRedeemed ──────────────────────────────────────────────────────────

export async function handleVotingVestingPlanRedeemed(event: any, context: any) {
  const { db } = context;
  const { id, planRemainder } = event.args;

  // Only update if the plan exists (it won't if it was a non-ENS token plan)
  const plan = await db.find(votingVestingPlan, { id });
  if (!plan) return;

  await db.update(votingVestingPlan, { id }).set({
    remainder: planRemainder,
  });

  await db.insert(votingVestingBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder,
    kind: "redemption",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingVesting:PlanRedeemed", async ({ event, context }) => {
  await handleVotingVestingPlanRedeemed(event, context);
});

// ─── PlanRevoked ───────────────────────────────────────────────────────────
//
// `_revokePlan(planId, revokeTime)` — semantics from the verified source:
// only the UNVESTED portion (`revokedAmount`) is withdrawn from the vault to
// the vestingAdmin. The vested-but-unredeemed portion (`amountRedeemed` — a
// misleading ABI name: nothing is paid to the holder at revoke time) STAYS in
// the plan/vault and continues vesting on the original schedule, with the
// vestingAdmin zeroed so it cannot be revoked again. So the post-revoke
// remainder is `amountRedeemed`, not zero — unless `amountRedeemed` is 0, in
// which case the plan is deleted and its NFT burned (the burn Transfer fires
// BEFORE PlanRevoked and records the 0x0 ownership row).

export async function handleVotingVestingPlanRevoked(event: any, context: any) {
  const { db } = context;
  const { id, amountRedeemed } = event.args;

  const plan = await db.find(votingVestingPlan, { id });
  if (!plan) return;

  await db.update(votingVestingPlan, { id }).set({
    remainder: amountRedeemed,
  });

  await db.insert(votingVestingBalanceEvent).values({
    id: `${id}-${event.block.number}-${event.log.logIndex}`,
    planId: id,
    planRemainder: amountRedeemed,
    kind: "revocation",
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingVesting:PlanRevoked", async ({ event, context }) => {
  await handleVotingVestingPlanRevoked(event, context);
});

// ─── Transfer (ERC721 — vesting plan NFT ownership) ────────────────────────
//
// Plan NFTs are non-transferable by the holder; the only ownership changes
// are the vestingAdmin's transferFrom (which calls ERC721 _transfer, so this
// event still fires, alongside the redundant PlanTransferredByVestingAdmin)
// and burns from full redemption / zero-balance revocation.

export async function handleVotingVestingTransfer(event: any, context: any) {
  const { db } = context;
  const { from, to, tokenId } = event.args;
  const fromAddr = (from as string).toLowerCase();
  const toAddr = (to as string).toLowerCase();

  // Skip mints — PlanCreated already sets the initial owner
  if (fromAddr === ZERO_ADDRESS) return;

  // Only process if we have this plan (non-ENS plans are skipped)
  const plan = await db.find(votingVestingPlan, { id: tokenId });
  if (!plan) return;

  if (toAddr !== ZERO_ADDRESS) {
    // Transfer to new owner — update recipient (burns keep the last recipient
    // on the plan row; the 0x0 ownership row below records the burn)
    await db.update(votingVestingPlan, { id: tokenId }).set({
      recipient: toAddr,
    });
  }

  await db.insert(votingVestingNftOwnership).values({
    id: `${tokenId}-${event.block.number}-${event.log.logIndex}`,
    planId: tokenId,
    owner: toAddr,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
  });
}

ponder.on("HedgeyVotingVesting:Transfer", async ({ event, context }) => {
  await handleVotingVestingTransfer(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerHedgeyVotingVestingHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
  // This function exists so tests can verify the module loads cleanly.
}
