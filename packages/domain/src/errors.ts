/**
 * Thrown by BlockRepository.getBlockForTimestamp when the requested timestamp is
 * newer than the chain's finalized head — i.e. the target block is not yet
 * finalized (it may not even exist yet). Resolving it now would either clamp to a
 * stale pre-target block or read a reorg-able one, corrupting the lottery RANDAO.
 * Callers should defer and retry once finality advances past the target. DEV-897.
 */
export class BlockNotFinalizedError extends Error {
  constructor(
    public readonly targetTimestamp: bigint,
    public readonly finalizedTimestamp: bigint,
    public readonly finalizedBlock: bigint,
  ) {
    super(
      `Timestamp ${targetTimestamp} is not yet finalized: finalized head is block ` +
        `${finalizedBlock} @ ${finalizedTimestamp}`,
    );
    this.name = "BlockNotFinalizedError";
  }
}
