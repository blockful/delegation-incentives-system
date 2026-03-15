import type { Event } from "ponder:registry";

interface EventMeta {
  blockNumber: bigint;
  timestamp: bigint;
  transactionHash: string;
  logId: string;
}

export function eventMeta(event: Event): EventMeta {
  return {
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    logId: `${event.transaction.hash}-${event.log.logIndex}`,
  };
}
