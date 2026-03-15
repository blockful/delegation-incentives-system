import schema from "ponder:schema";
import { zeroAddress } from "viem";

import { normalizeAddress, tokenIdToAddress } from "../common/address.js";
import { eventMeta } from "../common/events.js";
import { ponder, type Db, type IndexingFunctionArgs } from "../common/ponder.js";

interface MultiDelegateTransferParams {
  db: Db;
  transferId: string;
  from: string;
  to: string;
  tokenId: bigint;
  value: bigint;
  blockNumber: bigint;
  timestamp: bigint;
  transactionHash: string;
}

/**
 * Shared between TransferSingle and TransferBatch so position tracking
 * stays consistent for both ERC1155 event shapes.
 */
export async function processMultiDelegateTransfer(
  params: MultiDelegateTransferParams,
) {
  const {
    db,
    transferId,
    from,
    to,
    tokenId,
    value,
    blockNumber,
    timestamp,
    transactionHash,
  } = params;

  const fromAddress = normalizeAddress(from);
  const toAddress = normalizeAddress(to);
  const delegateAddress = tokenIdToAddress(tokenId);

  await db.insert(schema.multiDelegateTransfer).values({
    id: transferId,
    from: fromAddress,
    to: toAddress,
    delegate: delegateAddress,
    amount: value,
    blockNumber,
    timestamp,
    transactionHash,
  });

  if (from !== zeroAddress) {
    const fromPositionId = `${fromAddress}-${delegateAddress}`;
    const existing = await db.find(schema.multiDelegatePosition, {
      id: fromPositionId,
    });

    if (existing) {
      const newAmount = existing.amount - value;

      if (newAmount > 0n) {
        await db
          .update(schema.multiDelegatePosition, { id: fromPositionId })
          .set({ amount: newAmount, lastUpdatedBlock: blockNumber });
      } else {
        await db.delete(schema.multiDelegatePosition, { id: fromPositionId });
        // Remove the protocol mapping for this (from, delegate) pair.
        // Without this, a stale mapping would persist after a position transfer,
        // causing the deduplication step to incorrectly map fromAddress → proxy
        // even though fromAddress no longer holds any position.
        await db.delete(schema.protocolMapping, {
          id: `multi_delegate-${fromAddress}-${delegateAddress}`,
        });
      }
    }
  }

  if (to !== zeroAddress) {
    const toPositionId = `${toAddress}-${delegateAddress}`;

    await db
      .insert(schema.multiDelegatePosition)
      .values({
        id: toPositionId,
        owner: toAddress,
        delegate: delegateAddress,
        amount: value,
        lastUpdatedBlock: blockNumber,
      })
      .onConflictDoUpdate((row: any) => ({
        amount: row.amount + value,
        lastUpdatedBlock: blockNumber,
      }));

    const proxy = await db.find(schema.multiDelegateProxy, {
      id: delegateAddress,
    });
    const childAddress = proxy ? proxy.id : delegateAddress;

    await db
      .insert(schema.protocolMapping)
      .values({
        id: `multi_delegate-${toAddress}-${delegateAddress}`,
        childAddress,
        operatorAddress: toAddress,
        protocol: "multi_delegate",
      })
      .onConflictDoUpdate({
        operatorAddress: toAddress,
      });
  }
}

export async function handleProxyDeployed(
  event: {
    args: { delegate: string; proxyAddress: string };
    block: { number: bigint; timestamp: bigint };
    transaction: { from: string; hash: string };
    log: { logIndex: number };
  },
  context: { db: any },
): Promise<void> {
  const { delegate, proxyAddress } = event.args;
  const { blockNumber } = eventMeta(event);

  await context.db
    .insert(schema.multiDelegateProxy)
    .values({
      id: normalizeAddress(proxyAddress),
      delegate: normalizeAddress(delegate),
      deployer: normalizeAddress(event.transaction.from),
      createdAtBlock: blockNumber,
    })
    .onConflictDoNothing();
}

export async function handleTransferSingle(
  event: {
    args: { from: string; to: string; id: bigint; value: bigint };
    block: { number: bigint; timestamp: bigint };
    transaction: { hash: string };
    log: { logIndex: number };
  },
  context: { db: any },
): Promise<void> {
  const { from, to, id, value } = event.args;
  const meta = eventMeta(event);

  await processMultiDelegateTransfer({
    db: context.db,
    transferId: meta.logId,
    from,
    to,
    tokenId: id,
    value,
    blockNumber: meta.blockNumber,
    timestamp: meta.timestamp,
    transactionHash: meta.transactionHash,
  });
}

export async function handleTransferBatch(
  event: {
    args: { from: string; to: string; ids: bigint[]; values: bigint[] };
    block: { number: bigint; timestamp: bigint };
    transaction: { hash: string };
    log: { logIndex: number };
  },
  context: { db: any },
): Promise<void> {
  const { from, to, ids, values } = event.args;
  const meta = eventMeta(event);

  for (let index = 0; index < ids.length; index++) {
    await processMultiDelegateTransfer({
      db: context.db,
      transferId: `${meta.logId}-${index}`,
      from,
      to,
      tokenId: ids[index]!,
      value: values[index]!,
      blockNumber: meta.blockNumber,
      timestamp: meta.timestamp,
      transactionHash: meta.transactionHash,
    });
  }
}

export function registerMultiDelegateHandlers() {
  ponder.on(
    "ERC20MultiDelegate:ProxyDeployed",
    async ({
      event,
      context,
    }: IndexingFunctionArgs<"ERC20MultiDelegate:ProxyDeployed">) => {
      await handleProxyDeployed(event as any, context);
    },
  );

  ponder.on(
    "ERC20MultiDelegate:DelegationProcessed",
    async (
      _args: IndexingFunctionArgs<"ERC20MultiDelegate:DelegationProcessed">,
    ) => {
      // DelegationProcessed is supplementary only. Position accounting is derived
      // from TransferSingle and TransferBatch.
    },
  );

  ponder.on(
    "ERC20MultiDelegate:TransferSingle",
    async ({
      event,
      context,
    }: IndexingFunctionArgs<"ERC20MultiDelegate:TransferSingle">) => {
      await handleTransferSingle(event as any, context);
    },
  );

  ponder.on(
    "ERC20MultiDelegate:TransferBatch",
    async ({
      event,
      context,
    }: IndexingFunctionArgs<"ERC20MultiDelegate:TransferBatch">) => {
      await handleTransferBatch(event as any, context);
    },
  );
}
