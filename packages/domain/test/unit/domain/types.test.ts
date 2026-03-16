import { describe, it, expect } from "vitest";
import { weiSeconds } from "@/types.js";

describe("weiSeconds", () => {
  it("brands a bigint as WeiSeconds", () => {
    const ws = weiSeconds(1000n);
    expect(ws).toBe(1000n);
  });

  it("preserves zero", () => {
    expect(weiSeconds(0n)).toBe(0n);
  });
});
