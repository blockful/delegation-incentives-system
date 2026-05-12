import { describe, it, expect } from "vitest";
import {
  resolveEligibleDelegators,
  consolidateDelegators,
} from "../../src/consolidation.js";
import type {
  Address,
  Delegation,
  MultiDelegatePosition,
  EligibleDelegator,
  WalletAlias,
} from "../../src/types.js";
import { seconds, wei, blockNumber } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const alice: Address = "0xAlice000000000000000000000000000000000001";
const bob: Address = "0xBob0000000000000000000000000000000000000002";
const carol: Address = "0xCarol00000000000000000000000000000000000003";
const dave: Address = "0xDave000000000000000000000000000000000004";
const delegate1: Address = "0xDel1000000000000000000000000000000000001";
const delegate2: Address = "0xDel2000000000000000000000000000000000002";
const vestingContract: Address = "0xVest000000000000000000000000000000000001";
const vestingContract2: Address = "0xVest000000000000000000000000000000000002";

function makeDelegation(
  delegator: Address,
  delegate: Address,
): Delegation {
  return {
    delegator,
    delegate,
    timestamp: seconds(1_000_000n),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

function makeMultiDelegatePosition(
  holder: Address,
  delegate: Address,
): MultiDelegatePosition {
  return {
    holder,
    delegate,
    balance: wei(1_000_000_000_000_000_000n),
    timestamp: seconds(1_000_000n),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

// ---------------------------------------------------------------------------
// resolveEligibleDelegators
// ---------------------------------------------------------------------------

describe("resolveEligibleDelegators", () => {
  it("resolves direct delegators only", () => {
    const delegations = [
      makeDelegation(alice, delegate1),
      makeDelegation(bob, delegate1),
    ];
    const activeDelegates = new Set<Address>([delegate1]);

    const result = resolveEligibleDelegators(
      delegations,
      [],
      new Set(),
      new Map(),
      activeDelegates,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: alice,
      delegateAddress: delegate1,
      source: "direct",
    });
    expect(result[1]).toEqual({
      resolvedAddress: bob,
      originalAddress: bob,
      delegateAddress: delegate1,
      source: "direct",
    });
  });

  it("resolves MultiDelegate positions only", () => {
    const positions = [
      makeMultiDelegatePosition(alice, delegate1),
      makeMultiDelegatePosition(bob, delegate2),
    ];
    const activeDelegates = new Set<Address>([delegate1, delegate2]);

    const result = resolveEligibleDelegators(
      [],
      positions,
      new Set(),
      new Map(),
      activeDelegates,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: alice,
      delegateAddress: delegate1,
      source: "multidelegate",
    });
    expect(result[1]).toEqual({
      resolvedAddress: bob,
      originalAddress: bob,
      delegateAddress: delegate2,
      source: "multidelegate",
    });
  });

  it("resolves Hedgey vesting contract to NFT owner", () => {
    const delegations = [makeDelegation(vestingContract, delegate1)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
    ]);
    const activeDelegates = new Set<Address>([delegate1]);

    const result = resolveEligibleDelegators(
      delegations,
      [],
      vestingAddresses,
      nftOwners,
      activeDelegates,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: vestingContract,
      delegateAddress: delegate1,
      source: "hedgey",
      vestingPlanId: "1",
    });
  });

  it("skips Hedgey delegation when NFT owner is not found", () => {
    const delegations = [makeDelegation(vestingContract, delegate1)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map(); // no mapping
    const activeDelegates = new Set<Address>([delegate1]);

    const result = resolveEligibleDelegators(
      delegations,
      [],
      vestingAddresses,
      nftOwners,
      activeDelegates,
    );

    expect(result).toHaveLength(0);
  });

  it("handles mixed sources with same address appearing multiple times", () => {
    const delegations = [
      makeDelegation(alice, delegate1),
      makeDelegation(vestingContract, delegate1),
    ];
    const positions = [makeMultiDelegatePosition(alice, delegate2)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
    ]);
    const activeDelegates = new Set<Address>([delegate1, delegate2]);

    const result = resolveEligibleDelegators(
      delegations,
      positions,
      vestingAddresses,
      nftOwners,
      activeDelegates,
    );

    expect(result).toHaveLength(3);
    // Direct, Hedgey (resolved to alice), MultiDelegate
    expect(result.filter((r) => r.resolvedAddress === alice)).toHaveLength(3);
    expect(result.map((r) => r.source)).toEqual([
      "direct",
      "hedgey",
      "multidelegate",
    ]);
  });

  it("filters out delegations to non-active delegates", () => {
    const delegations = [
      makeDelegation(alice, delegate1),
      makeDelegation(bob, delegate2),
    ];
    const positions = [makeMultiDelegatePosition(carol, delegate2)];
    // Only delegate1 is active
    const activeDelegates = new Set<Address>([delegate1]);

    const result = resolveEligibleDelegators(
      delegations,
      positions,
      new Set(),
      new Map(),
      activeDelegates,
    );

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(alice);
    expect(result[0].delegateAddress).toBe(delegate1);
  });

  it("handles multiple Hedgey vesting contracts", () => {
    const delegations = [
      makeDelegation(vestingContract, delegate1),
      makeDelegation(vestingContract2, delegate1),
    ];
    const vestingAddresses = new Set<Address>([
      vestingContract,
      vestingContract2,
    ]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
      [vestingContract2, [{ planId: "2", owner: bob }]],
    ]);
    const activeDelegates = new Set<Address>([delegate1]);

    const result = resolveEligibleDelegators(
      delegations,
      [],
      vestingAddresses,
      nftOwners,
      activeDelegates,
    );

    expect(result).toHaveLength(2);
    expect(result[0].resolvedAddress).toBe(alice);
    expect(result[0].source).toBe("hedgey");
    expect(result[1].resolvedAddress).toBe(bob);
    expect(result[1].source).toBe("hedgey");
  });
});

// ---------------------------------------------------------------------------
// consolidateDelegators
// ---------------------------------------------------------------------------

describe("consolidateDelegators", () => {
  function makeEntry(
    resolved: Address,
    delegate: Address,
    source: "direct" | "multidelegate" | "hedgey" = "direct",
  ): EligibleDelegator {
    return {
      resolvedAddress: resolved,
      originalAddress: resolved,
      delegateAddress: delegate,
      source,
    };
  }

  it("groups entries by resolved address with no aliases", () => {
    const eligible: EligibleDelegator[] = [
      makeEntry(alice, delegate1),
      makeEntry(alice, delegate2, "multidelegate"),
      makeEntry(bob, delegate1),
    ];

    const result = consolidateDelegators(eligible, []);

    expect(result).toHaveLength(2);

    const aliceGroup = result.find((r) => r.resolvedAddress === alice);
    expect(aliceGroup).toBeDefined();
    expect(aliceGroup!.entries).toHaveLength(2);

    const bobGroup = result.find((r) => r.resolvedAddress === bob);
    expect(bobGroup).toBeDefined();
    expect(bobGroup!.entries).toHaveLength(1);
  });

  it("applies simple wallet alias", () => {
    const eligible: EligibleDelegator[] = [
      makeEntry(alice, delegate1),
      makeEntry(bob, delegate1),
    ];
    const aliases: WalletAlias[] = [{ secondary: alice, primary: bob }];

    const result = consolidateDelegators(eligible, aliases);

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(bob);
    expect(result[0].entries).toHaveLength(2);
  });

  it("applies transitive alias (A → B → C)", () => {
    const eligible: EligibleDelegator[] = [
      makeEntry(alice, delegate1),
      makeEntry(bob, delegate1),
      makeEntry(carol, delegate1),
    ];
    const aliases: WalletAlias[] = [
      { secondary: alice, primary: bob },
      { secondary: bob, primary: carol },
    ];

    const result = consolidateDelegators(eligible, aliases);

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(carol);
    expect(result[0].entries).toHaveLength(3);
  });

  it("throws on cycle in alias chain", () => {
    const eligible: EligibleDelegator[] = [makeEntry(alice, delegate1)];
    const aliases: WalletAlias[] = [
      { secondary: alice, primary: bob },
      { secondary: bob, primary: carol },
      { secondary: carol, primary: alice },
    ];

    expect(() => consolidateDelegators(eligible, aliases)).toThrow(
      /cycle detected/i,
    );
  });

  it("does not affect addresses not in alias map", () => {
    const eligible: EligibleDelegator[] = [
      makeEntry(alice, delegate1),
      makeEntry(dave, delegate1),
    ];
    const aliases: WalletAlias[] = [{ secondary: alice, primary: bob }];

    const result = consolidateDelegators(eligible, aliases);

    expect(result).toHaveLength(2);
    const bobGroup = result.find((r) => r.resolvedAddress === bob);
    expect(bobGroup).toBeDefined();
    expect(bobGroup!.entries).toHaveLength(1);

    const daveGroup = result.find((r) => r.resolvedAddress === dave);
    expect(daveGroup).toBeDefined();
    expect(daveGroup!.entries).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const result = consolidateDelegators([], []);
    expect(result).toEqual([]);
  });
});
