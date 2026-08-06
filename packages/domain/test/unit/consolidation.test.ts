import { describe, it, expect } from "vitest";
import {
  resolveEligibleTokenHolders,
  consolidateTokenHolders,
} from "../../src/consolidation.js";
import type {
  Address,
  Delegation,
  MultiDelegatePosition,
  EligibleTokenHolder,
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
const voter1: Address = "0xVtr1000000000000000000000000000000000001";
const voter2: Address = "0xVtr2000000000000000000000000000000000002";
const vestingContract: Address = "0xVest000000000000000000000000000000000001";
const vestingContract2: Address = "0xVest000000000000000000000000000000000002";

function makeDelegation(
  tokenHolder: Address,
  voter: Address,
): Delegation {
  return {
    tokenHolder,
    voter,
    timestamp: seconds(1_000_000n),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

function makeMultiDelegatePosition(
  holder: Address,
  voter: Address,
): MultiDelegatePosition {
  return {
    holder,
    voter,
    balance: wei(1_000_000_000_000_000_000n),
    timestamp: seconds(1_000_000n),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

// ---------------------------------------------------------------------------
// resolveEligibleTokenHolders
// ---------------------------------------------------------------------------

describe("resolveEligibleTokenHolders", () => {
  it("resolves direct token holders only", () => {
    const delegations = [
      makeDelegation(alice, voter1),
      makeDelegation(bob, voter1),
    ];
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      [],
      new Set(),
      new Set(),
      new Map(),
      activeVoters,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: alice,
      voterAddress: voter1,
      source: "direct",
    });
    expect(result[1]).toEqual({
      resolvedAddress: bob,
      originalAddress: bob,
      voterAddress: voter1,
      source: "direct",
    });
  });

  it("resolves MultiDelegate positions only", () => {
    const positions = [
      makeMultiDelegatePosition(alice, voter1),
      makeMultiDelegatePosition(bob, voter2),
    ];
    const activeVoters = new Set<Address>([voter1, voter2]);

    const result = resolveEligibleTokenHolders(
      [],
      positions,
      new Set(),
      new Set(),
      new Map(),
      activeVoters,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: alice,
      voterAddress: voter1,
      source: "multidelegate",
    });
    expect(result[1]).toEqual({
      resolvedAddress: bob,
      originalAddress: bob,
      voterAddress: voter2,
      source: "multidelegate",
    });
  });

  it("resolves Hedgey vesting contract to NFT owner", () => {
    const delegations = [makeDelegation(vestingContract, voter1)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
    ]);
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      [],
      new Set(),
      vestingAddresses,
      nftOwners,
      activeVoters,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      resolvedAddress: alice,
      originalAddress: vestingContract,
      voterAddress: voter1,
      source: "hedgey",
      vestingPlanId: "1",
    });
  });

  it("skips Hedgey delegation when NFT owner is not found", () => {
    const delegations = [makeDelegation(vestingContract, voter1)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map(); // no mapping
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      [],
      new Set(),
      vestingAddresses,
      nftOwners,
      activeVoters,
    );

    expect(result).toHaveLength(0);
  });

  it("handles mixed sources with same address appearing multiple times", () => {
    const delegations = [
      makeDelegation(alice, voter1),
      makeDelegation(vestingContract, voter1),
    ];
    const positions = [makeMultiDelegatePosition(alice, voter2)];
    const vestingAddresses = new Set<Address>([vestingContract]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
    ]);
    const activeVoters = new Set<Address>([voter1, voter2]);

    const result = resolveEligibleTokenHolders(
      delegations,
      positions,
      new Set(),
      vestingAddresses,
      nftOwners,
      activeVoters,
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

  it("filters out delegations to non-active voters", () => {
    const delegations = [
      makeDelegation(alice, voter1),
      makeDelegation(bob, voter2),
    ];
    const positions = [makeMultiDelegatePosition(carol, voter2)];
    // Only voter1 is active
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      positions,
      new Set(),
      new Set(),
      new Map(),
      activeVoters,
    );

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(alice);
    expect(result[0].voterAddress).toBe(voter1);
  });

  it("handles multiple Hedgey vesting contracts", () => {
    const delegations = [
      makeDelegation(vestingContract, voter1),
      makeDelegation(vestingContract2, voter1),
    ];
    const vestingAddresses = new Set<Address>([
      vestingContract,
      vestingContract2,
    ]);
    const nftOwners = new Map([
      [vestingContract, [{ planId: "1", owner: alice }]],
      [vestingContract2, [{ planId: "2", owner: bob }]],
    ]);
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      [],
      new Set(),
      vestingAddresses,
      nftOwners,
      activeVoters,
    );

    expect(result).toHaveLength(2);
    expect(result[0].resolvedAddress).toBe(alice);
    expect(result[0].source).toBe("hedgey");
    expect(result[1].resolvedAddress).toBe(bob);
    expect(result[1].source).toBe("hedgey");
  });

  it("regression: excludes MultiDelegate proxy vaults from the direct-holder set", () => {
    // Round-1 defect: an ERC20MultiDelegate proxy vault delegates its pooled
    // balance to the voter and entered the holder set as source:"direct",
    // while its depositors were ALSO credited via their ERC1155 receipts —
    // the same ENS counted twice in the TWB denominator, with 36.77% of the
    // pool routed to unrecoverable proxy addresses (bytecode 0xff).
    const proxy: Address = "0xProxy0000000000000000000000000000000001";
    const delegations = [
      makeDelegation(proxy, voter1), // the vault itself — must be dropped
      makeDelegation(alice, voter1), // a normal direct holder — must pass
    ];
    // bob deposited into the vault: he holds an ERC1155 receipt for voter1.
    const positions = [makeMultiDelegatePosition(bob, voter1)];
    const proxyAddresses = new Set<Address>([proxy]);
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      delegations,
      positions,
      proxyAddresses,
      new Set(),
      new Map(),
      activeVoters,
    );

    // The proxy appears nowhere — not resolved, not as an original address.
    expect(
      result.some(
        (r) => r.resolvedAddress === proxy || r.originalAddress === proxy,
      ),
    ).toBe(false);

    // The normal direct holder passes through untouched.
    const direct = result.filter((r) => r.source === "direct");
    expect(direct).toHaveLength(1);
    expect(direct[0].resolvedAddress).toBe(alice);

    // The depositor still enters via the multidelegate leg.
    const multi = result.filter((r) => r.source === "multidelegate");
    expect(multi).toHaveLength(1);
    expect(multi[0].resolvedAddress).toBe(bob);
    expect(multi[0].voterAddress).toBe(voter1);

    expect(result).toHaveLength(2);
  });

  it("does not drop ERC1155 depositors whose address happens to be checked against the proxy set", () => {
    // The proxy exclusion only guards the direct-holder branch; the
    // multidelegate leg is receipt-backed and must be unaffected by the set.
    const proxy: Address = "0xProxy0000000000000000000000000000000001";
    const positions = [makeMultiDelegatePosition(alice, voter1)];
    const activeVoters = new Set<Address>([voter1]);

    const result = resolveEligibleTokenHolders(
      [],
      positions,
      new Set<Address>([proxy]),
      new Set(),
      new Map(),
      activeVoters,
    );

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("multidelegate");
    expect(result[0].resolvedAddress).toBe(alice);
  });
});

// ---------------------------------------------------------------------------
// consolidateTokenHolders
// ---------------------------------------------------------------------------

describe("consolidateTokenHolders", () => {
  function makeEntry(
    resolved: Address,
    voter: Address,
    source: "direct" | "multidelegate" | "hedgey" = "direct",
  ): EligibleTokenHolder {
    return {
      resolvedAddress: resolved,
      originalAddress: resolved,
      voterAddress: voter,
      source,
    };
  }

  it("groups entries by resolved address with no aliases", () => {
    const eligible: EligibleTokenHolder[] = [
      makeEntry(alice, voter1),
      makeEntry(alice, voter2, "multidelegate"),
      makeEntry(bob, voter1),
    ];

    const result = consolidateTokenHolders(eligible, []);

    expect(result).toHaveLength(2);

    const aliceGroup = result.find((r) => r.resolvedAddress === alice);
    expect(aliceGroup).toBeDefined();
    expect(aliceGroup!.entries).toHaveLength(2);

    const bobGroup = result.find((r) => r.resolvedAddress === bob);
    expect(bobGroup).toBeDefined();
    expect(bobGroup!.entries).toHaveLength(1);
  });

  it("applies simple wallet alias", () => {
    const eligible: EligibleTokenHolder[] = [
      makeEntry(alice, voter1),
      makeEntry(bob, voter1),
    ];
    const aliases: WalletAlias[] = [{ secondary: alice, primary: bob }];

    const result = consolidateTokenHolders(eligible, aliases);

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(bob);
    expect(result[0].entries).toHaveLength(2);
  });

  it("applies transitive alias (A → B → C)", () => {
    const eligible: EligibleTokenHolder[] = [
      makeEntry(alice, voter1),
      makeEntry(bob, voter1),
      makeEntry(carol, voter1),
    ];
    const aliases: WalletAlias[] = [
      { secondary: alice, primary: bob },
      { secondary: bob, primary: carol },
    ];

    const result = consolidateTokenHolders(eligible, aliases);

    expect(result).toHaveLength(1);
    expect(result[0].resolvedAddress).toBe(carol);
    expect(result[0].entries).toHaveLength(3);
  });

  it("throws on cycle in alias chain", () => {
    const eligible: EligibleTokenHolder[] = [makeEntry(alice, voter1)];
    const aliases: WalletAlias[] = [
      { secondary: alice, primary: bob },
      { secondary: bob, primary: carol },
      { secondary: carol, primary: alice },
    ];

    expect(() => consolidateTokenHolders(eligible, aliases)).toThrow(
      /cycle detected/i,
    );
  });

  it("does not affect addresses not in alias map", () => {
    const eligible: EligibleTokenHolder[] = [
      makeEntry(alice, voter1),
      makeEntry(dave, voter1),
    ];
    const aliases: WalletAlias[] = [{ secondary: alice, primary: bob }];

    const result = consolidateTokenHolders(eligible, aliases);

    expect(result).toHaveLength(2);
    const bobGroup = result.find((r) => r.resolvedAddress === bob);
    expect(bobGroup).toBeDefined();
    expect(bobGroup!.entries).toHaveLength(1);

    const daveGroup = result.find((r) => r.resolvedAddress === dave);
    expect(daveGroup).toBeDefined();
    expect(daveGroup!.entries).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    const result = consolidateTokenHolders([], []);
    expect(result).toEqual([]);
  });
});
