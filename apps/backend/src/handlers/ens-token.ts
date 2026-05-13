import { ponder } from "ponder:registry";
import {
  ensBalance,
  ensBalanceEvent,
  ensDelegation,
  ensDelegationEvent,
  ensVotingPowerSnapshot,
} from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── Transfer(from, to, value) ──────────────────────────────────────────────

export async function handleEnsTransfer(event: any, context: any) {
  const { db } = context;
  const { from, to, value } = event.args;
  const fromAddr = from.toLowerCase();
  const toAddr = to.toLowerCase();

  // --- Sender side (skip mints from zero address) ---
  if (fromAddr !== ZERO_ADDRESS) {
    const delta = -value;
    const deltaMod = value; // abs of negative value

    const senderRow = await db
      .insert(ensBalance)
      .values({
        id: fromAddr,
        balance: delta,
        lastUpdatedBlock: event.block.number,
      })
      .onConflictDoUpdate((row: any) => ({
        balance: row.balance + delta,
        lastUpdatedBlock: event.block.number,
      }));

    await db.insert(ensBalanceEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-from`,
      accountId: fromAddr,
      balance: senderRow.balance,
      delta,
      deltaMod,
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });
  }

  // --- Receiver side (skip burns to zero address) ---
  if (toAddr !== ZERO_ADDRESS) {
    const delta = value;
    const deltaMod = value; // abs of positive value

    const receiverRow = await db
      .insert(ensBalance)
      .values({
        id: toAddr,
        balance: delta,
        lastUpdatedBlock: event.block.number,
      })
      .onConflictDoUpdate((row: any) => ({
        balance: row.balance + delta,
        lastUpdatedBlock: event.block.number,
      }));

    await db.insert(ensBalanceEvent).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-to`,
      accountId: toAddr,
      balance: receiverRow.balance,
      delta,
      deltaMod,
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });
  }
}

ponder.on("ENSToken:Transfer", async ({ event, context }) => {
  await handleEnsTransfer(event, context);
});

// ─── DelegateChanged(delegator, fromDelegate, toDelegate) ───────────────────

export async function handleDelegateChanged(event: any, context: any) {
  const { db } = context;
  const { delegator, fromDelegate, toDelegate } = event.args;
  const tokenHolderAddr = delegator.toLowerCase();
  const fromDelegateAddr = fromDelegate.toLowerCase();
  const toDelegateAddr = toDelegate.toLowerCase();

  // Upsert current delegation state
  await db
    .insert(ensDelegation)
    .values({
      id: tokenHolderAddr,
      voterId: toDelegateAddr,
      lastUpdatedBlock: event.block.number,
    })
    .onConflictDoUpdate({
      voterId: toDelegateAddr,
      lastUpdatedBlock: event.block.number,
    });

  // Look up the token holder's current balance (may not exist yet)
  const balanceRow = await db.find(ensBalance, { id: tokenHolderAddr });
  const delegatedValue = balanceRow?.balance ?? 0n;

  await db.insert(ensDelegationEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    tokenHolderId: tokenHolderAddr,
    fromVoterId: fromDelegateAddr,
    toVoterId: toDelegateAddr,
    delegatedValue,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
}

ponder.on("ENSToken:DelegateChanged", async ({ event, context }) => {
  await handleDelegateChanged(event, context);
});

// ─── DelegateVotesChanged(delegate, previousBalance, newBalance) ────────────

export async function handleDelegateVotesChanged(event: any, context: any) {
  const { db } = context;
  const { delegate, previousBalance, newBalance } = event.args;
  const delta = newBalance - previousBalance;
  const deltaMod = delta < 0n ? -delta : delta;

  await db.insert(ensVotingPowerSnapshot).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    voterId: delegate.toLowerCase(),
    votingPower: newBalance,
    delta,
    deltaMod,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
}

ponder.on("ENSToken:DelegateVotesChanged", async ({ event, context }) => {
  await handleDelegateVotesChanged(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerEnsTokenHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
}
