import { ponder } from "ponder:registry";
import {
  multiDelegateProxy,
  multiDelegatePosition,
  multiDelegateTransfer,
  protocolMapping,
} from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Derive the voter address from an ERC1155 token ID.
 * The token ID is the uint256 representation of the voter's address.
 */
function voterFromTokenId(tokenId: bigint): string {
  return ("0x" + tokenId.toString(16).padStart(40, "0")).toLowerCase();
}

/**
 * Core logic for processing a single ERC1155 transfer (mint, burn, or transfer).
 *
 * Exported for direct unit-testing; also called by the ponder.on handlers below.
 */
export async function processMultiDelegateTransfer(params: {
  db: any;
  transferId: string;
  from: string;
  to: string;
  tokenId: bigint;
  value: bigint;
  blockNumber: bigint;
  logIndex: number;
  timestamp: bigint;
  transactionHash: string;
}) {
  const {
    db,
    transferId,
    from,
    to,
    tokenId,
    value,
    blockNumber,
    logIndex,
    timestamp,
    transactionHash,
  } = params;

  const fromAddr = from.toLowerCase();
  const toAddr = to.toLowerCase();
  const voter = voterFromTokenId(tokenId);

  // Always record the transfer event
  await db.insert(multiDelegateTransfer).values({
    id: transferId,
    from: fromAddr,
    to: toAddr,
    voter,
    amount: value,
    blockNumber,
    logIndex,
    timestamp,
    transactionHash,
  });

  // --- Decrement sender's position (skip zero address = mint) ---
  if (fromAddr !== ZERO_ADDRESS) {
    const posId = `${fromAddr}-${voter}`;
    const existing = await db.find(multiDelegatePosition, { id: posId });

    if (existing) {
      const newAmount = existing.amount - value;
      if (newAmount <= 0n) {
        // Position fully withdrawn — clean up
        await db.delete(multiDelegatePosition, { id: posId });
        await db.delete(protocolMapping, { id: `multi_delegate-${posId}` });
      } else {
        await db
          .insert(multiDelegatePosition)
          .values({
            id: posId,
            owner: fromAddr,
            voter,
            amount: newAmount,
            lastUpdatedBlock: blockNumber,
          })
          .onConflictDoUpdate({
            amount: newAmount,
            lastUpdatedBlock: blockNumber,
          });
      }
    }
  }

  // --- Increment receiver's position (skip zero address = burn) ---
  if (toAddr !== ZERO_ADDRESS) {
    const posId = `${toAddr}-${voter}`;

    await db
      .insert(multiDelegatePosition)
      .values({
        id: posId,
        owner: toAddr,
        voter,
        amount: value,
        lastUpdatedBlock: blockNumber,
      })
      .onConflictDoUpdate((existing: any) => ({
        amount: existing.amount + value,
        lastUpdatedBlock: blockNumber,
      }));

    // Record protocol mapping for deduplication tracking.
    // The voter address is used as childAddress — proxy lookup is not
    // possible here because multiDelegateProxy is keyed by proxyAddress
    // and Ponder handlers only support primary-key lookups.
    await db
      .insert(protocolMapping)
      .values({
        id: `multi_delegate-${posId}`,
        childAddress: voter,
        operatorAddress: toAddr,
        protocol: "multi_delegate",
      })
      .onConflictDoNothing();
  }
}

// ─── ProxyDeployed(delegate, proxyAddress) ─────────────────────────────────

export async function handleProxyDeployed(event: any, context: any) {
  const { db } = context;
  const { delegate, proxyAddress } = event.args;

  await db
    .insert(multiDelegateProxy)
    .values({
      id: proxyAddress.toLowerCase(),
      voter: delegate.toLowerCase(),
      deployer: (event.transaction.from as string).toLowerCase(),
      createdAtBlock: event.block.number,
    })
    .onConflictDoNothing();
}

ponder.on("ERC20MultiDelegate:ProxyDeployed", async ({ event, context }) => {
  await handleProxyDeployed(event, context);
});

// ─── TransferSingle(operator, from, to, id, value) ────────────────────────

export async function handleTransferSingle(event: any, context: any) {
  const { db } = context;
  const { from, to, id, value } = event.args;

  await processMultiDelegateTransfer({
    db,
    transferId: `${event.transaction.hash}-${event.log.logIndex}`,
    from,
    to,
    tokenId: id,
    value,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
}

ponder.on("ERC20MultiDelegate:TransferSingle", async ({ event, context }) => {
  await handleTransferSingle(event, context);
});

// ─── TransferBatch(operator, from, to, ids, values) ───────────────────────

export async function handleTransferBatch(event: any, context: any) {
  const { db } = context;
  const { from, to, ids, values } = event.args;

  for (let i = 0; i < ids.length; i++) {
    await processMultiDelegateTransfer({
      db,
      transferId: `${event.transaction.hash}-${event.log.logIndex}-${i}`,
      from,
      to,
      tokenId: ids[i],
      value: values[i],
      blockNumber: event.block.number,
      logIndex: event.log.logIndex,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });
  }
}

ponder.on("ERC20MultiDelegate:TransferBatch", async ({ event, context }) => {
  await handleTransferBatch(event, context);
});

/**
 * Register function (called by side-effect import).
 * Exported for smoke-testing that the module loads without errors.
 */
export function registerMultiDelegateHandlers() {
  // Handlers are registered at module scope via ponder.on() calls above.
  // This function exists so tests can verify the module loads cleanly.
}
