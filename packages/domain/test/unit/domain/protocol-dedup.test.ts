import { describe, it, expect } from "vitest";
import { consolidateDelegators } from "@/protocol-dedup.js";
import {
  type DelegatorScore,
  type ProtocolMapping,
  type WalletAlias,
  wei,
  ONE_ENS,
} from "@/types.js";

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

describe("consolidateDelegators (protocol mappings only)", () => {
  it("returns unchanged scores when no mappings", () => {
    const scores = [score("0xa", 100n), score("0xb", 200n)];
    const result = consolidateDelegators(scores, [], []);
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
    const result = consolidateDelegators(scores, mappings, []);
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
    const result = consolidateDelegators(scores, mappings, []);
    expect(result.length).toBe(1);
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
    const result = consolidateDelegators(scores, mappings, []);
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
    const result = consolidateDelegators(scores, mappings, []);
    expect(result.length).toBe(1);
    expect(result[0].timeWeightedBalance).toBe(wei(100n * ONE_ENS));
  });

  it("merges child with existing operator score", () => {
    const scores = [score("0xoperator", 100n), score("0xchild", 200n)];
    const mappings: ProtocolMapping[] = [
      {
        childAddress: "0xchild",
        operatorAddress: "0xoperator",
        protocol: "Hedgey",
      },
    ];
    const result = consolidateDelegators(scores, mappings, []);
    expect(result.length).toBe(1);
    expect(result[0].timeWeightedBalance).toBe(wei(300n * ONE_ENS));
  });
});

describe("consolidateDelegators (with wallet aliases)", () => {
  it("merges known wallet aliases to primary address", () => {
    const scores = [score("0xwallet-a", 100n), score("0xwallet-b", 200n)];
    const aliases: WalletAlias[] = [
      {
        secondaryAddress: "0xwallet-b",
        primaryAddress: "0xwallet-a",
        source: "manual-review",
      },
    ];
    const result = consolidateDelegators(scores, [], aliases);
    expect(result.length).toBe(1);
    expect(result[0].delegatorId).toBe("0xwallet-a");
    expect(result[0].timeWeightedBalance).toBe(wei(300n * ONE_ENS));
  });

  it("applies both protocol mappings and wallet aliases", () => {
    const scores = [
      score("0xproxy", 50n),
      score("0xwallet-a", 100n),
      score("0xwallet-b", 200n),
    ];
    const protocolMappings: ProtocolMapping[] = [
      {
        childAddress: "0xproxy",
        operatorAddress: "0xwallet-b",
        protocol: "MultiDelegate",
      },
    ];
    const aliases: WalletAlias[] = [
      {
        secondaryAddress: "0xwallet-b",
        primaryAddress: "0xwallet-a",
        source: "ens-dao-verified",
      },
    ];
    const result = consolidateDelegators(scores, protocolMappings, aliases);
    expect(result.length).toBe(1);
    expect(result[0].delegatorId).toBe("0xwallet-a");
    expect(result[0].timeWeightedBalance).toBe(wei(350n * ONE_ENS));
  });

  it("resolves transitive chains", () => {
    const scores = [score("0xa", 100n), score("0xb", 100n), score("0xc", 100n)];
    const protocolMappings: ProtocolMapping[] = [
      { childAddress: "0xa", operatorAddress: "0xb", protocol: "MultiDelegate" },
    ];
    const aliases: WalletAlias[] = [
      { secondaryAddress: "0xb", primaryAddress: "0xc", source: "manual" },
    ];
    const result = consolidateDelegators(scores, protocolMappings, aliases);
    expect(result.length).toBe(1);
    expect(result[0].delegatorId).toBe("0xc");
    expect(result[0].timeWeightedBalance).toBe(wei(300n * ONE_ENS));
  });

  it("returns unchanged when no aliases or mappings", () => {
    const scores = [score("0xa", 100n), score("0xb", 200n)];
    const result = consolidateDelegators(scores, [], []);
    expect(result.length).toBe(2);
  });

  it("handles multiple secondaries pointing to same primary", () => {
    const scores = [
      score("0xprimary", 100n),
      score("0xsec1", 50n),
      score("0xsec2", 75n),
    ];
    const aliases: WalletAlias[] = [
      { secondaryAddress: "0xsec1", primaryAddress: "0xprimary", source: "manual" },
      { secondaryAddress: "0xsec2", primaryAddress: "0xprimary", source: "manual" },
    ];
    const result = consolidateDelegators(scores, [], aliases);
    expect(result.length).toBe(1);
    expect(result[0].delegatorId).toBe("0xprimary");
    expect(result[0].timeWeightedBalance).toBe(wei(225n * ONE_ENS));
  });

  it("routes rewards to canonical address (not proxy/secondary)", () => {
    const scores = [score("0xproxy-contract", 500n)];
    const protocolMappings: ProtocolMapping[] = [
      {
        childAddress: "0xproxy-contract",
        operatorAddress: "0xreal-owner",
        protocol: "HedgeyVesting",
      },
    ];
    const result = consolidateDelegators(scores, protocolMappings, []);
    expect(result[0].delegatorId).toBe("0xreal-owner");
  });
});
