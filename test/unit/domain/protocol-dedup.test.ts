import { describe, it, expect } from "vitest";
import { deduplicateDelegators } from "@/domain/protocol-dedup.js";
import {
  type DelegatorScore,
  type ProtocolMapping,
  wei,
  ONE_ENS,
} from "@/domain/types.js";

function score(
  id: string,
  twb: bigint,
  delegateId = "delegate1",
): DelegatorScore {
  return {
    delegatorId: id,
    delegateId,
    timeWeightedBalance: wei(twb * ONE_ENS),
  };
}

describe("deduplicateDelegators", () => {
  it("returns unchanged scores when no mappings", () => {
    const scores = [score("0xa", 100n), score("0xb", 200n)];
    const result = deduplicateDelegators(scores, []);
    expect(result.length).toBe(2);
  });

  it("merges two child addresses to one operator", () => {
    const scores = [score("0xchild1", 100n), score("0xchild2", 200n)];
    const mappings: ProtocolMapping[] = [
      {
        childAddress: "0xchild1",
        operatorAddress: "0xoperator",
        protocol: "MultiDelegate",
      },
      {
        childAddress: "0xchild2",
        operatorAddress: "0xoperator",
        protocol: "MultiDelegate",
      },
    ];
    const result = deduplicateDelegators(scores, mappings);
    expect(result.length).toBe(1);
    expect(result[0].delegatorId).toBe("0xoperator");
    expect(result[0].timeWeightedBalance).toBe(wei(300n * ONE_ENS));
  });

  it("handles case-insensitive address matching", () => {
    const scores = [score("0xChild1", 100n)];
    const mappings: ProtocolMapping[] = [
      {
        childAddress: "0xchild1",
        operatorAddress: "0xOperator",
        protocol: "Hedgey",
      },
    ];
    const result = deduplicateDelegators(scores, mappings);
    expect(result.length).toBe(1);
    // Address is lowercased for normalization
    expect(result[0].delegatorId.toLowerCase()).toBe("0xoperator");
    expect(result[0].timeWeightedBalance).toBe(wei(100n * ONE_ENS));
  });

  it("does not merge unmapped addresses", () => {
    const scores = [score("0xa", 100n), score("0xb", 200n), score("0xc", 50n)];
    const mappings: ProtocolMapping[] = [
      {
        childAddress: "0xa",
        operatorAddress: "0xoperator",
        protocol: "MultiDelegate",
      },
    ];
    const result = deduplicateDelegators(scores, mappings);
    expect(result.length).toBe(3);
    const operatorScore = result.find(
      (r) => r.delegatorId.toLowerCase() === "0xoperator",
    );
    expect(operatorScore!.timeWeightedBalance).toBe(wei(100n * ONE_ENS));
  });

  it("handles mapping to self (no-op)", () => {
    const scores = [score("0xa", 100n)];
    const mappings: ProtocolMapping[] = [
      { childAddress: "0xa", operatorAddress: "0xa", protocol: "Self" },
    ];
    const result = deduplicateDelegators(scores, mappings);
    expect(result.length).toBe(1);
    expect(result[0].timeWeightedBalance).toBe(wei(100n * ONE_ENS));
  });

  it("merges child with existing operator score", () => {
    // Operator already has their own score + a child's score
    const scores = [score("0xoperator", 100n), score("0xchild", 200n)];
    const mappings: ProtocolMapping[] = [
      {
        childAddress: "0xchild",
        operatorAddress: "0xoperator",
        protocol: "Hedgey",
      },
    ];
    const result = deduplicateDelegators(scores, mappings);
    expect(result.length).toBe(1);
    expect(result[0].timeWeightedBalance).toBe(wei(300n * ONE_ENS));
  });
});
