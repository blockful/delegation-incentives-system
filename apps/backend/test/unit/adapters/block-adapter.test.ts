import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { BlockNotFinalizedError, seconds } from "@ens-dis/domain";
import { createBlockAdapter } from "../../../src/adapters/block-adapter.js";

interface FakeBlock {
  number: bigint;
  timestamp: bigint;
}

function makeClient(blocks: FakeBlock[], finalizedNumber: bigint): PublicClient {
  const byNumber = new Map(blocks.map((b) => [b.number, b]));
  return {
    getBlock: async (args: { blockTag?: string; blockNumber?: bigint }) => {
      if (args.blockTag === "finalized") {
        const head = byNumber.get(finalizedNumber);
        if (!head) throw new Error("fake: finalized block missing");
        return head;
      }
      const block = byNumber.get(args.blockNumber as bigint);
      if (!block) throw new Error(`fake: block ${args.blockNumber} missing`);
      return block;
    },
  } as unknown as PublicClient;
}

// block n has timestamp 88 + 12n  ->  b1=100, b5=148, b6=160, b10=208
function makeBlocks(count: number): FakeBlock[] {
  return Array.from({ length: count }, (_, i) => {
    const number = BigInt(i + 1);
    return { number, timestamp: 88n + number * 12n };
  });
}

describe("createBlockAdapter.getBlockForTimestamp", () => {
  it("returns the last block at or before the target when finality is past it", async () => {
    const adapter = createBlockAdapter(makeClient(makeBlocks(10), 10n));
    // target 150: b5=148 <= 150 < b6=160
    const result = await adapter.getBlockForTimestamp(seconds(150n));
    expect(result).toBe(5n);
  });

  it("is finality-stable: same block whether finality is just past or far past the target", async () => {
    const blocks = makeBlocks(10);
    const justPast = createBlockAdapter(makeClient(blocks, 6n)); // head b6=160
    const farPast = createBlockAdapter(makeClient(blocks, 10n)); // head b10=208
    const a = await justPast.getBlockForTimestamp(seconds(150n));
    const b = await farPast.getBlockForTimestamp(seconds(150n));
    expect(a).toBe(5n);
    expect(b).toBe(5n);
    expect(a).toBe(b);
  });

  it("throws BlockNotFinalizedError when the finalized head is behind the target", async () => {
    const adapter = createBlockAdapter(makeClient(makeBlocks(10), 5n)); // head b5=148
    await expect(
      adapter.getBlockForTimestamp(seconds(200n)),
    ).rejects.toBeInstanceOf(BlockNotFinalizedError);
  });

  it("throws BlockNotFinalizedError when the finalized head sits exactly on the target (boundary inside the lag window)", async () => {
    const adapter = createBlockAdapter(makeClient(makeBlocks(10), 5n)); // head b5=148
    await expect(
      adapter.getBlockForTimestamp(seconds(148n)),
    ).rejects.toBeInstanceOf(BlockNotFinalizedError);
  });
});
