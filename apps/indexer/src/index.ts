import { ponder } from "ponder:registry";
import schema from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENS_TOKEN = "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72".toLowerCase();
const HEDGEY_VESTING_ADDRESS = "0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C".toLowerCase();

/**
 * Converts a uint256 token ID to a delegate address.
 * In ERC20MultiDelegate, the token ID is the delegate address cast to uint256.
 */
function tokenIdToAddress(tokenId: bigint): string {
  return ("0x" + tokenId.toString(16).padStart(40, "0")).toLowerCase();
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
  const { db } = context;

  const delegateAddress = tokenIdToAddress(id);

  // Record the transfer
  await db.insert(schema.multiDelegateTransfer).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    delegate: delegateAddress,
    amount: value,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });

  // Update positions — decrease sender's position
  if (from !== ZERO_ADDRESS) {
    const fromPositionId = `${from.toLowerCase()}-${delegateAddress}`;
    const existing = await db.find(schema.multiDelegatePosition, { id: fromPositionId });
    if (existing) {
      const newAmount = existing.amount - value;
      if (newAmount > 0n) {
        await db
          .update(schema.multiDelegatePosition, { id: fromPositionId })
          .set({
            amount: newAmount,
            lastUpdatedBlock: BigInt(event.block.number),
          });
      } else {
        await db.delete(schema.multiDelegatePosition, { id: fromPositionId });
      }
    }
  }

  // Update positions — increase receiver's position
  if (to !== ZERO_ADDRESS) {
    const toPositionId = `${to.toLowerCase()}-${delegateAddress}`;
    await db
      .insert(schema.multiDelegatePosition)
      .values({
        id: toPositionId,
        owner: to.toLowerCase(),
        delegate: delegateAddress,
        amount: value,
        lastUpdatedBlock: BigInt(event.block.number),
      })
      .onConflictDoUpdate((row) => ({
        amount: row.amount + value,
        lastUpdatedBlock: BigInt(event.block.number),
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
});

ponder.on("ERC20MultiDelegate:TransferBatch", async ({ event, context }) => {
  const { from, to, ids, values } = event.args;
  const { db } = context;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const value = values[i]!;
    const delegateAddress = tokenIdToAddress(id);

    // Record the transfer
    await db.insert(schema.multiDelegateTransfer).values({
      id: `${event.transaction.hash}-${event.log.logIndex}-${i}`,
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      delegate: delegateAddress,
      amount: value,
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
    });

    // Update positions — decrease sender's position
    if (from !== ZERO_ADDRESS) {
      const fromPositionId = `${from.toLowerCase()}-${delegateAddress}`;
      const existing = await db.find(schema.multiDelegatePosition, { id: fromPositionId });
      if (existing) {
        const newAmount = existing.amount - value;
        if (newAmount > 0n) {
          await db
            .update(schema.multiDelegatePosition, { id: fromPositionId })
            .set({
              amount: newAmount,
              lastUpdatedBlock: BigInt(event.block.number),
            });
        } else {
          await db.delete(schema.multiDelegatePosition, { id: fromPositionId });
        }
      }
    }

    // Update positions — increase receiver's position
    if (to !== ZERO_ADDRESS) {
      const toPositionId = `${to.toLowerCase()}-${delegateAddress}`;
      await db
        .insert(schema.multiDelegatePosition)
        .values({
          id: toPositionId,
          owner: to.toLowerCase(),
          delegate: delegateAddress,
          amount: value,
          lastUpdatedBlock: BigInt(event.block.number),
        })
        .onConflictDoUpdate((row) => ({
          amount: row.amount + value,
          lastUpdatedBlock: BigInt(event.block.number),
        }));

      // Insert protocol mapping
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
  if (from === ZERO_ADDRESS) return;

  // Check if this plan exists (i.e., it's an ENS token plan we're tracking)
  const plan = await db.find(schema.vestingPlan, { id: tokenId });
  if (!plan) return;

  // Update the recipient on the vesting plan
  await db
    .update(schema.vestingPlan, { id: tokenId })
    .set({
      recipient: to.toLowerCase(),
    });

  // Update the protocol mapping to reflect the new owner
  const mappingId = `hedgey_vesting-${tokenId.toString()}`;
  await db
    .update(schema.protocolMapping, { id: mappingId })
    .set({
      operatorAddress: to.toLowerCase(),
    });
});
