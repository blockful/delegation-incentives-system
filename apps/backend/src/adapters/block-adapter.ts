import type { PublicClient } from "viem";
import type { BlockRepository } from "@ens-dis/domain";
import type { Seconds, BlockNumber } from "@ens-dis/domain";
import { blockNumber as bn, BlockNotFinalizedError } from "@ens-dis/domain";

export function createBlockAdapter(client: PublicClient): BlockRepository {
  return {
    async getBlockForTimestamp(timestamp: Seconds): Promise<BlockNumber> {
      // Binary search for the block closest to (but not after) the timestamp.
      const targetTs = BigInt(timestamp);

      const finalizedHead = await client.getBlock({ blockTag: "finalized" });
      let lo = 1n;
      let hi = finalizedHead.number;

      // Finality guard (DEV-897): if the finalized head has not yet reached the
      // target timestamp, the true block for `timestamp` is not finalized (it may
      // not even exist yet). Refuse to clamp to the finalized head — that would
      // silently return a pre-target block and seed the lottery from the wrong
      // RANDAO. Signal "not ready" so the caller can defer and retry once
      // finality advances past the target.
      if (finalizedHead.timestamp <= targetTs) {
        throw new BlockNotFinalizedError(
          targetTs,
          finalizedHead.timestamp,
          finalizedHead.number,
        );
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
