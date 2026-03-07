import { ponder } from "ponder:registry";
import schema from "ponder:schema";
import { zeroAddress } from "viem";

const ENS_TOKEN = "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72".toLowerCase();
const HEDGEY_VESTING_ADDRESS = "0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C".toLowerCase();

/**
 * Converts a uint256 token ID to a delegate address.
 * In ERC20MultiDelegate, the token ID is the delegate address cast to uint256.
 */
function tokenIdToAddress(tokenId: bigint): string {
  return ("0x" + tokenId.toString(16).padStart(40, "0")).toLowerCase();
}

// ─── Shared helper for ERC20MultiDelegate transfer processing ───────────────

/**
 * Processes a single ERC1155 transfer within the ERC20MultiDelegate contract.
 * Shared between TransferSingle and TransferBatch handlers to eliminate duplication.
 *
 * Following the anticapture pattern: receiver positions use atomic
 * insert-on-conflict-update, sender positions still need find-then-update
 * because we may need to delete on zero balance.
 */
async function processMultiDelegateTransfer(
  db: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"]["db"],
  transferId: string,
  from: string,
  to: string,
  tokenId: bigint,
  value: bigint,
  blockNumber: bigint,
  timestamp: bigint,
  transactionHash: string,
) {
  const delegateAddress = tokenIdToAddress(tokenId);

  // Record the transfer
  await db.insert(schema.multiDelegateTransfer).values({
    id: transferId,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    delegate: delegateAddress,
    amount: value,
    blockNumber,
    timestamp,
    transactionHash,
  });

  // Update positions — decrease sender's position
  if (from !== zeroAddress) {
    const fromPositionId = `${from.toLowerCase()}-${delegateAddress}`;
    const existing = await db.find(schema.multiDelegatePosition, { id: fromPositionId });
    if (existing) {
      const newAmount = existing.amount - value;
      if (newAmount > 0n) {
        await db
          .update(schema.multiDelegatePosition, { id: fromPositionId })
          .set({ amount: newAmount, lastUpdatedBlock: blockNumber });
      } else {
        await db.delete(schema.multiDelegatePosition, { id: fromPositionId });
      }
    }
  }

  // Update positions — increase receiver's position (atomic upsert)
  if (to !== zeroAddress) {
    const toPositionId = `${to.toLowerCase()}-${delegateAddress}`;
    await db
      .insert(schema.multiDelegatePosition)
      .values({
        id: toPositionId,
        owner: to.toLowerCase(),
        delegate: delegateAddress,
        amount: value,
        lastUpdatedBlock: blockNumber,
      })
      .onConflictDoUpdate((row) => ({
        amount: row.amount + value,
        lastUpdatedBlock: blockNumber,
      }));

    // Insert protocol mapping: the proxy for this delegate maps to the depositor
    const proxy = await db.find(schema.multiDelegateProxy, { id: delegateAddress });
    const childAddress = proxy ? proxy.id : delegateAddress;

    await db
      .insert(schema.protocolMapping)
      .values({
        id: `multi_delegate-${to.toLowerCase()}-${delegateAddress}`,
        childAddress,
        operatorAddress: to.toLowerCase(),
        protocol: "multi_delegate",
      })
      .onConflictDoUpdate({
        operatorAddress: to.toLowerCase(),
      });
  }
}

// ─── ERC20MultiDelegate Handlers ────────────────────────────────────────────

ponder.on("ERC20MultiDelegate:ProxyDeployed", async ({ event, context }) => {
  const { delegate, proxyAddress } = event.args;
  const { db } = context;

  await db
    .insert(schema.multiDelegateProxy)
    .values({
      id: proxyAddress.toLowerCase(),
      delegate: delegate.toLowerCase(),
      deployer: event.transaction.from.toLowerCase(),
      createdAtBlock: BigInt(event.block.number),
    })
    .onConflictDoNothing();
});

ponder.on("ERC20MultiDelegate:DelegationProcessed", async ({ event, context }) => {
  // DelegationProcessed events provide additional context about delegation flows.
  // The primary position tracking is handled by TransferSingle/TransferBatch events.
});

ponder.on("ERC20MultiDelegate:TransferSingle", async ({ event, context }) => {
  const { from, to, id, value } = event.args;

  await processMultiDelegateTransfer(
    context.db,
    `${event.transaction.hash}-${event.log.logIndex}`,
    from,
    to,
    id,
    value,
    BigInt(event.block.number),
    BigInt(event.block.timestamp),
    event.transaction.hash,
  );
});

ponder.on("ERC20MultiDelegate:TransferBatch", async ({ event, context }) => {
  const { from, to, ids, values } = event.args;

  for (let i = 0; i < ids.length; i++) {
    await processMultiDelegateTransfer(
      context.db,
      `${event.transaction.hash}-${event.log.logIndex}-${i}`,
      from,
      to,
      ids[i]!,
      values[i]!,
      BigInt(event.block.number),
      BigInt(event.block.timestamp),
      event.transaction.hash,
    );
  }
});

// ─── Hedgey Vesting (TokenVestingPlans) Handlers ────────────────────────────

ponder.on("HedgeyVesting:PlanCreated", async ({ event, context }) => {
  const { id, recipient, token, amount, start, cliff, rate, period } = event.args;
  const { db } = context;

  // Only index plans for the ENS token
  if (token.toLowerCase() !== ENS_TOKEN) return;

  await db.insert(schema.vestingPlan).values({
    id,
    recipient: recipient.toLowerCase(),
    token: token.toLowerCase(),
    amount,
    start,
    cliff,
    rate,
    period,
    amountRedeemed: 0n,
    createdAtBlock: BigInt(event.block.number),
  });

  // Map the vesting contract address to the recipient
  await db
    .insert(schema.protocolMapping)
    .values({
      id: `hedgey_vesting-${id.toString()}`,
      childAddress: HEDGEY_VESTING_ADDRESS,
      operatorAddress: recipient.toLowerCase(),
      protocol: "hedgey_vesting",
    })
    .onConflictDoNothing();
});

ponder.on("HedgeyVesting:PlanRedeemed", async ({ event, context }) => {
  const { id, amountRedeemed, planRemainder } = event.args;
  const { db } = context;

  // Check if this plan exists (i.e., it's an ENS token plan we're tracking)
  const plan = await db.find(schema.vestingPlan, { id });
  if (!plan) return;

  // Update the plan's redeemed amount
  await db
    .update(schema.vestingPlan, { id })
    .set({
      amountRedeemed: plan.amountRedeemed + amountRedeemed,
    });

  // Record the redemption event
  await db.insert(schema.vestingRedemption).values({
    id: `${id.toString()}-${event.block.number}`,
    planId: id,
    amountRedeemed,
    planRemainder,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
  });
});

ponder.on("HedgeyVesting:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;
  const { db } = context;

  // Skip mint events (from = zero address) — handled by PlanCreated
  if (from === zeroAddress) return;

  // Check if this plan exists (i.e., it's an ENS token plan we're tracking)
  const plan = await db.find(schema.vestingPlan, { id: tokenId });
  if (!plan) return;

  const mappingId = `hedgey_vesting-${tokenId.toString()}`;

  // Handle burn: NFT sent to zero address means the plan is concluded
  if (to === zeroAddress) {
    await db.delete(schema.protocolMapping, { id: mappingId });
    return;
  }

  // Update the recipient on the vesting plan
  await db
    .update(schema.vestingPlan, { id: tokenId })
    .set({
      recipient: to.toLowerCase(),
    });

  // Update the protocol mapping to reflect the new owner
  await db
    .update(schema.protocolMapping, { id: mappingId })
    .set({
      operatorAddress: to.toLowerCase(),
    });
});

// ─── ENS Token Handlers ─────────────────────────────────────────────────────

/**
 * Handles ENS token Transfer events.
 *
 * Inspired by anticapture's tokenTransfer pattern:
 * - Uses atomic insert-on-conflict-update for balance tracking
 * - Records balance events with both signed delta and absolute deltaMod
 * - The resulting balance is derived from the atomic upsert
 */
ponder.on("ENSToken:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  const { db } = context;
  const blockNumber = BigInt(event.block.number);
  const timestamp = BigInt(event.block.timestamp);
  const logId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update sender balance atomically and record event (skip mints from zero address)
  if (from !== zeroAddress) {
    const fromAddr = from.toLowerCase();

    // Atomic upsert: insert with -value or decrement existing balance
    const { balance: currentSenderBalance } = await db
      .insert(schema.ensBalance)
      .values({ id: fromAddr, balance: -value, lastUpdatedBlock: blockNumber })
      .onConflictDoUpdate((row) => ({
        balance: row.balance - value,
        lastUpdatedBlock: blockNumber,
      }));

    await db.insert(schema.ensBalanceEvent).values({
      id: `${logId}-from`,
      accountId: fromAddr,
      balance: currentSenderBalance,
      delta: -value,
      deltaMod: value,
      blockNumber,
      timestamp,
      transactionHash: event.transaction.hash,
    });
  }

  // Update receiver balance atomically and record event (skip burns to zero address)
  if (to !== zeroAddress) {
    const toAddr = to.toLowerCase();

    // Atomic upsert: insert with +value or increment existing balance
    const { balance: currentReceiverBalance } = await db
      .insert(schema.ensBalance)
      .values({ id: toAddr, balance: value, lastUpdatedBlock: blockNumber })
      .onConflictDoUpdate((row) => ({
        balance: row.balance + value,
        lastUpdatedBlock: blockNumber,
      }));

    await db.insert(schema.ensBalanceEvent).values({
      id: `${logId}-to`,
      accountId: toAddr,
      balance: currentReceiverBalance,
      delta: value,
      deltaMod: value,
      blockNumber,
      timestamp,
      transactionHash: event.transaction.hash,
    });
  }
});

/**
 * Handles ENS token DelegateChanged events.
 *
 * Inspired by anticapture's delegateChanged pattern:
 * - Looks up the delegator's current token balance and stores it as delegatedValue
 * - This provides the backend with delegation weight at delegation time
 */
ponder.on("ENSToken:DelegateChanged", async ({ event, context }) => {
  const { delegator, fromDelegate, toDelegate } = event.args;
  const { db } = context;
  const blockNumber = BigInt(event.block.number);
  const timestamp = BigInt(event.block.timestamp);
  const logId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Look up delegator's current ENS balance for delegated value tracking
  const delegatorBalance = await db.find(schema.ensBalance, {
    id: delegator.toLowerCase(),
  });
  const delegatedValue = delegatorBalance?.balance ?? 0n;

  // Update current delegation state
  await db
    .insert(schema.ensDelegation)
    .values({
      id: delegator.toLowerCase(),
      delegateId: toDelegate.toLowerCase(),
      lastUpdatedBlock: blockNumber,
    })
    .onConflictDoUpdate({
      delegateId: toDelegate.toLowerCase(),
      lastUpdatedBlock: blockNumber,
    });

  // Record the delegation change event with delegated value
  await db.insert(schema.ensDelegationEvent).values({
    id: logId,
    delegatorId: delegator.toLowerCase(),
    fromDelegateId: fromDelegate.toLowerCase(),
    toDelegateId: toDelegate.toLowerCase(),
    delegatedValue,
    blockNumber,
    timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handles ENS token DelegateVotesChanged events.
 *
 * Inspired by anticapture's delegatedVotesChanged pattern:
 * - Stores both signed delta and absolute deltaMod
 * - deltaMod enables efficient queries for significant VP changes regardless of direction
 */
ponder.on("ENSToken:DelegateVotesChanged", async ({ event, context }) => {
  const { delegate, previousBalance, newBalance } = event.args;
  const { db } = context;

  const delta = newBalance - previousBalance;
  const deltaMod = delta > 0n ? delta : -delta;

  await db.insert(schema.ensVotingPowerSnapshot).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    accountId: delegate.toLowerCase(),
    votingPower: newBalance,
    delta,
    deltaMod,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });
});
