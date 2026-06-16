import { describe, expect, it } from "vitest";
import { BlockNotFinalizedError } from "../../src/errors.js";

describe("BlockNotFinalizedError", () => {
  it("is an Error carrying the target, finalized timestamp and finalized block", () => {
    const error = new BlockNotFinalizedError(1000n, 940n, 25218719n);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("BlockNotFinalizedError");
    expect(error.targetTimestamp).toBe(1000n);
    expect(error.finalizedTimestamp).toBe(940n);
    expect(error.finalizedBlock).toBe(25218719n);
    expect(error.message).toContain("not yet finalized");
  });
});
