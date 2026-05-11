import type { PublicClient } from "viem";
import type { BlockRepository } from "@ens-dis/domain";
import type { Seconds, BlockNumber } from "@ens-dis/domain";
import { blockNumber as bn } from "@ens-dis/domain";

export function createBlockAdapter(client: PublicClient): BlockRepository {
  return {
    async getBlockForTimestamp(timestamp: Seconds): Promise<BlockNumber> {
      // Binary search for the block closest to (but not after) the timestamp.
      const targetTs = BigInt(timestamp);

      const latestBlock = await client.getBlock({ blockTag: "finalized" });
      let lo = 1n;
      let hi = latestBlock.number;

      // Edge case: target is at or after the latest block
      if (latestBlock.timestamp <= targetTs) {
        return bn(latestBlock.number);
      }

      while (lo < hi) {
        const mid = lo + (hi - lo) / 2n;
        const midBlock = await client.getBlock({ blockNumber: mid });

        if (midBlock.timestamp <= targetTs) {
          lo = mid + 1n;
        } else {
          hi = mid;
        }
      }

      // lo is now the first block AFTER timestamp, so we want lo - 1
      return bn(lo - 1n);
    },

    async getRandaoValue(block: BlockNumber): Promise<string> {
      const blockData = await client.getBlock({ blockNumber: BigInt(block) });
      // mixHash contains the prevRandao value post-merge
      return blockData.mixHash ?? "0x0";
    },
  };
}
