import { describe, expect, it } from "vitest";
import { createVestingAdapter } from "../../../src/adapters/vesting-adapter.js";
import { FakePonderDb, type Row } from "../../doubles/fake-ponder-db.js";
import { seconds } from "@ens-dis/domain";

const HEDGEY_VESTING_ADDRESS = "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";
const ENS_TOKEN = "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72";
const NON_ENS_TOKEN = "0x1111111111111111111111111111111111111111";
const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const VAULT_9 = "0xdddddddddddddddddddddddddddddddddddddd09";
const VAULT_10 = "0xdddddddddddddddddddddddddddddddddddddd10";
const VV_VAULT_9 = "0xffffffffffffffffffffffffffffffffffffff09";
const VV_VAULT_10 = "0xffffffffffffffffffffffffffffffffffffff10";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeLockupPlanRow(overrides: Partial<Row> & { id: bigint }): Row {
  return {
    recipient: ALICE,
    token: ENS_TOKEN,
    amount: 1_000n,
    remainder: 1_000n,
    createdAtBlock: 100n,
    createdAtTimestamp: 1_000n,
    createdAtLogIndex: 0,
    ...overrides,
  };
}

function makeVaultRow(overrides: Partial<Row> & { id: bigint }): Row {
  return {
    vaultAddress: VAULT_9,
    createdAtBlock: 150n,
    createdAtTimestamp: 1_500n,
    createdAtLogIndex: 0,
    ...overrides,
  };
}

function makeVotingVestingPlanRow(overrides: Partial<Row> & { id: bigint }): Row {
  return {
    recipient: ALICE,
    token: ENS_TOKEN,
    amount: 1_000n,
    remainder: 1_000n,
    createdAtBlock: 100n,
    createdAtTimestamp: 1_000n,
    createdAtLogIndex: 0,
    ...overrides,
  };
}

function makeVotingVestingVaultRow(overrides: Partial<Row> & { id: bigint }): Row {
  return {
    vaultAddress: VV_VAULT_9,
    createdAtBlock: 150n,
    createdAtTimestamp: 1_500n,
    createdAtLogIndex: 0,
    ...overrides,
  };
}

function makeDb(seed: Record<string, Row[]>): FakePonderDb {
  return new FakePonderDb(seed);
}

// ─── getVestingContractAddresses ─────────────────────────────────────────────

describe("createVestingAdapter.getVestingContractAddresses", () => {
  it("always includes the Hedgey vesting master contract", async () => {
    const adapter = createVestingAdapter(makeDb({}) as any);
    const result = await adapter.getVestingContractAddresses();
    expect(result).toContain(HEDGEY_VESTING_ADDRESS);
  });

  it("includes per-plan VotingVault addresses of indexed lockup plans", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [makeVaultRow({ id: 9n, vaultAddress: VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getVestingContractAddresses();

    expect(result).toContain(VAULT_9);
  });

  it("excludes vaults whose plan was never indexed (non-ENS lockup plans)", async () => {
    // The VotingVaultCreated handler records vaults unconditionally; only
    // vaults joined to an indexed (ENS) plan may enter the exclusion set.
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [
        makeVaultRow({ id: 9n, vaultAddress: VAULT_9 }),
        makeVaultRow({ id: 77n, vaultAddress: VAULT_10 }),
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getVestingContractAddresses();

    expect(result).toContain(VAULT_9);
    expect(result).not.toContain(VAULT_10);
  });

  it("lowercases vault addresses so set membership against indexer addresses never misses", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [
        makeVaultRow({ id: 9n, vaultAddress: "0xAbCdEF0000000000000000000000000000000001" }),
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getVestingContractAddresses();

    expect(result).toContain("0xabcdef0000000000000000000000000000000001");
  });

  it("still includes protocol-mapped hedgey_vesting addresses", async () => {
    const db = makeDb({
      protocol_mapping: [
        {
          id: "hedgey_vesting-1",
          childAddress: HEDGEY_VESTING_ADDRESS,
          operatorAddress: ALICE,
          protocol: "hedgey_vesting",
        },
        {
          id: "multi_delegate-x",
          childAddress: "0x9999999999999999999999999999999999999999",
          operatorAddress: ALICE,
          protocol: "multi_delegate",
        },
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getVestingContractAddresses();

    expect(result).toContain(HEDGEY_VESTING_ADDRESS);
    expect(result).not.toContain("0x9999999999999999999999999999999999999999");
  });
});

// ─── getPlansForContracts ────────────────────────────────────────────────────

describe("createVestingAdapter.getPlansForContracts", () => {
  it("resolves a vault address to its lockup plan, keyed to the vault", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n, amount: 500n })],
      lockup_voting_vault: [makeVaultRow({ id: 9n, vaultAddress: VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts([VAULT_9 as any]);

    expect(result).toHaveLength(1);
    expect(result[0].planId).toBe("lockup-9");
    expect(result[0].contractAddress).toBe(VAULT_9);
    expect(result[0].token).toBe(ENS_TOKEN);
    expect(result[0].amount).toBe(500n);
  });

  it("returns both master vesting plans and vault lockup plans in one call", async () => {
    const db = makeDb({
      vesting_plan: [
        {
          id: 9n, // same numeric id as the lockup plan — must not collide
          recipient: BOB,
          token: ENS_TOKEN,
          amount: 777n,
          amountRedeemed: 0n,
          createdAtBlock: 50n,
          createdAtTimestamp: 500n,
          createdAtLogIndex: 0,
        },
      ],
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [makeVaultRow({ id: 9n, vaultAddress: VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts([
      HEDGEY_VESTING_ADDRESS as any,
      VAULT_9 as any,
    ]);

    const planIds = result.map((p) => p.planId).sort();
    expect(planIds).toEqual(["9", "lockup-9"]);
    const vesting = result.find((p) => p.planId === "9")!;
    expect(vesting.contractAddress).toBe(HEDGEY_VESTING_ADDRESS);
    const lockup = result.find((p) => p.planId === "lockup-9")!;
    expect(lockup.contractAddress).toBe(VAULT_9);
  });

  it("excludes lockup plans created after atTimestamp", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n, createdAtTimestamp: 5_000n })],
      lockup_voting_vault: [
        makeVaultRow({ id: 9n, vaultAddress: VAULT_9, createdAtTimestamp: 5_500n }),
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts(
      [VAULT_9 as any],
      seconds(4_000n),
    );

    expect(result).toHaveLength(0);
  });

  it("excludes lockup plans whose vault did not exist yet at atTimestamp", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n, createdAtTimestamp: 1_000n })],
      lockup_voting_vault: [
        makeVaultRow({ id: 9n, vaultAddress: VAULT_9, createdAtTimestamp: 6_000n }),
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts(
      [VAULT_9 as any],
      seconds(4_000n),
    );

    expect(result).toHaveLength(0);
  });

  it("returns empty for unknown addresses", async () => {
    const db = makeDb({
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [makeVaultRow({ id: 9n, vaultAddress: VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts([BOB as any]);

    expect(result).toHaveLength(0);
  });
});

// ─── getNftOwnerAtTimestamp ──────────────────────────────────────────────────

describe("createVestingAdapter.getNftOwnerAtTimestamp", () => {
  it("routes lockup- planIds to lockup_nft_ownership", async () => {
    const db = makeDb({
      lockup_nft_ownership: [
        { id: "9-100-0", planId: 9n, owner: ALICE, blockNumber: 100n, logIndex: 0, timestamp: 1_000n },
        { id: "9-200-0", planId: 9n, owner: BOB, blockNumber: 200n, logIndex: 0, timestamp: 2_000n },
      ],
      vesting_nft_ownership: [
        // same numeric planId on the vesting side — must NOT be picked up
        { id: "9-100-0", planId: 9n, owner: "0x9999999999999999999999999999999999999999", blockNumber: 100n, logIndex: 0, timestamp: 1_000n },
      ],
    });
    const adapter = createVestingAdapter(db as any);

    expect(await adapter.getNftOwnerAtTimestamp("lockup-9", seconds(1_500n))).toBe(ALICE);
    expect(await adapter.getNftOwnerAtTimestamp("lockup-9", seconds(2_500n))).toBe(BOB);
  });

  it("returns the zero address when no ownership rows exist yet", async () => {
    const adapter = createVestingAdapter(makeDb({}) as any);
    expect(await adapter.getNftOwnerAtTimestamp("lockup-9", seconds(1n))).toBe(
      "0x0000000000000000000000000000000000000000",
    );
  });
});

// ─── getPlanBalanceAtTimestamp / getPlanBalanceEventsInRange ─────────────────

describe("createVestingAdapter lockup plan balances", () => {
  const seed = {
    lockup_plan: [makeLockupPlanRow({ id: 9n, amount: 1_000n, remainder: 700n, createdAtTimestamp: 1_000n })],
    lockup_voting_vault: [
      makeVaultRow({ id: 9n, vaultAddress: VAULT_9, createdAtTimestamp: 2_000n }),
    ],
    lockup_balance_event: [
      // pre-vault redemption: tokens were NOT delegated yet
      { id: "9-110-0", planId: 9n, planRemainder: 900n, kind: "redemption", blockNumber: 110n, logIndex: 0, timestamp: 1_500n },
      // vault funding snapshot
      { id: "9-150-0", planId: 9n, planRemainder: 900n, kind: "vault_funded", blockNumber: 150n, logIndex: 0, timestamp: 2_000n },
      // post-vault redemption
      { id: "9-300-0", planId: 9n, planRemainder: 700n, kind: "redemption", blockNumber: 300n, logIndex: 0, timestamp: 3_000n },
    ],
  };

  it("returns 0 before the voting vault existed (tokens not yet delegated)", async () => {
    const adapter = createVestingAdapter(makeDb(seed) as any);
    expect(await adapter.getPlanBalanceAtTimestamp("lockup-9", seconds(1_700n))).toBe(0n);
  });

  it("returns the funded remainder from vault creation onward", async () => {
    const adapter = createVestingAdapter(makeDb(seed) as any);
    expect(await adapter.getPlanBalanceAtTimestamp("lockup-9", seconds(2_500n))).toBe(900n);
  });

  it("returns the latest remainder after later redemptions", async () => {
    const adapter = createVestingAdapter(makeDb(seed) as any);
    expect(await adapter.getPlanBalanceAtTimestamp("lockup-9", seconds(3_500n))).toBe(700n);
  });

  it("returns 0 for a plan with no vault at all", async () => {
    const db = makeDb({ lockup_plan: [makeLockupPlanRow({ id: 9n })] });
    const adapter = createVestingAdapter(db as any);
    expect(await adapter.getPlanBalanceAtTimestamp("lockup-9", seconds(9_999n))).toBe(0n);
  });

  it("lists balance events in range, excluding pre-vault history", async () => {
    const adapter = createVestingAdapter(makeDb(seed) as any);

    const events = await adapter.getPlanBalanceEventsInRange(
      "lockup-9",
      seconds(0n),
      seconds(10_000n),
    );

    expect(events.map((e) => [e.timestamp, e.balance])).toEqual([
      [2_000n, 900n],
      [3_000n, 700n],
    ]);
    expect(events.every((e) => e.planId === "lockup-9")).toBe(true);
  });

  it("keeps master vesting plan balance semantics intact", async () => {
    const db = makeDb({
      vesting_plan: [
        {
          id: 5n,
          recipient: ALICE,
          token: ENS_TOKEN,
          amount: 400n,
          amountRedeemed: 0n,
          createdAtBlock: 10n,
          createdAtTimestamp: 100n,
          createdAtLogIndex: 0,
        },
      ],
      vesting_redemption: [
        { id: "5-50-0", planId: 5n, amountRedeemed: 100n, planRemainder: 300n, blockNumber: 50n, logIndex: 0, timestamp: 500n },
      ],
    });
    const adapter = createVestingAdapter(db as any);

    expect(await adapter.getPlanBalanceAtTimestamp("5", seconds(50n))).toBe(0n);
    expect(await adapter.getPlanBalanceAtTimestamp("5", seconds(200n))).toBe(400n);
    expect(await adapter.getPlanBalanceAtTimestamp("5", seconds(600n))).toBe(300n);
  });
});

// ─── Voting Vesting leg (VotingTokenVestingPlans, prefix "voting-vesting-") ──

describe("createVestingAdapter voting-vesting leg", () => {
  it("includes VotingTokenVestingPlans vaults of indexed plans in the contract set", async () => {
    const db = makeDb({
      voting_vesting_plan: [makeVotingVestingPlanRow({ id: 9n })],
      voting_vesting_vault: [
        makeVotingVestingVaultRow({ id: 9n, vaultAddress: VV_VAULT_9 }),
        // vault of a non-ENS plan — no plan row, must stay out
        makeVotingVestingVaultRow({ id: 77n, vaultAddress: VV_VAULT_10 }),
      ],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getVestingContractAddresses();

    expect(result).toContain(VV_VAULT_9);
    expect(result).not.toContain(VV_VAULT_10);
  });

  it("resolves a VotingTokenVestingPlans vault to its plan with the voting-vesting- planId", async () => {
    const db = makeDb({
      voting_vesting_plan: [makeVotingVestingPlanRow({ id: 128n, amount: 200n })],
      voting_vesting_vault: [makeVotingVestingVaultRow({ id: 128n, vaultAddress: VV_VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts([VV_VAULT_9 as any]);

    expect(result).toHaveLength(1);
    expect(result[0].planId).toBe("voting-vesting-128");
    expect(result[0].contractAddress).toBe(VV_VAULT_9);
    expect(result[0].token).toBe(ENS_TOKEN);
    expect(result[0].amount).toBe(200n);
  });

  it("keeps the three plan-id namespaces apart for the same numeric id", async () => {
    const db = makeDb({
      vesting_plan: [
        {
          id: 9n,
          recipient: BOB,
          token: ENS_TOKEN,
          amount: 777n,
          amountRedeemed: 0n,
          createdAtBlock: 50n,
          createdAtTimestamp: 500n,
          createdAtLogIndex: 0,
        },
      ],
      lockup_plan: [makeLockupPlanRow({ id: 9n })],
      lockup_voting_vault: [makeVaultRow({ id: 9n, vaultAddress: VAULT_9 })],
      voting_vesting_plan: [makeVotingVestingPlanRow({ id: 9n })],
      voting_vesting_vault: [makeVotingVestingVaultRow({ id: 9n, vaultAddress: VV_VAULT_9 })],
    });
    const adapter = createVestingAdapter(db as any);

    const result = await adapter.getPlansForContracts([
      HEDGEY_VESTING_ADDRESS as any,
      VAULT_9 as any,
      VV_VAULT_9 as any,
    ]);

    const planIds = result.map((p) => p.planId).sort();
    expect(planIds).toEqual(["9", "lockup-9", "voting-vesting-9"]);
    expect(result.find((p) => p.planId === "lockup-9")!.contractAddress).toBe(VAULT_9);
    expect(result.find((p) => p.planId === "voting-vesting-9")!.contractAddress).toBe(VV_VAULT_9);
  });

  it("routes voting-vesting- planIds to voting_vesting_nft_ownership (vault resolves to ownerOf)", async () => {
    const db = makeDb({
      voting_vesting_nft_ownership: [
        { id: "128-100-0", planId: 128n, owner: ALICE, blockNumber: 100n, logIndex: 0, timestamp: 1_000n },
        { id: "128-200-0", planId: 128n, owner: BOB, blockNumber: 200n, logIndex: 0, timestamp: 2_000n },
      ],
      lockup_nft_ownership: [
        // same numeric planId on the lockup side — must NOT be picked up
        { id: "128-100-0", planId: 128n, owner: "0x9999999999999999999999999999999999999999", blockNumber: 100n, logIndex: 0, timestamp: 1_000n },
      ],
    });
    const adapter = createVestingAdapter(db as any);

    expect(await adapter.getNftOwnerAtTimestamp("voting-vesting-128", seconds(1_500n))).toBe(ALICE);
    expect(await adapter.getNftOwnerAtTimestamp("voting-vesting-128", seconds(2_500n))).toBe(BOB);
  });

  it("gates the plan balance on vault funding and follows the revocation remainder", async () => {
    const seed = {
      voting_vesting_plan: [
        makeVotingVestingPlanRow({ id: 128n, amount: 1_000n, remainder: 400n, createdAtTimestamp: 1_000n }),
      ],
      voting_vesting_vault: [
        makeVotingVestingVaultRow({ id: 128n, vaultAddress: VV_VAULT_9, createdAtTimestamp: 2_000n }),
      ],
      voting_vesting_balance_event: [
        // vault funding snapshot
        { id: "128-150-0", planId: 128n, planRemainder: 1_000n, kind: "vault_funded", blockNumber: 150n, logIndex: 0, timestamp: 2_000n },
        // vestingAdmin revoked: 400 vested stays in the vault, 600 unvested returned
        { id: "128-300-0", planId: 128n, planRemainder: 400n, kind: "revocation", blockNumber: 300n, logIndex: 0, timestamp: 3_000n },
      ],
    };
    const adapter = createVestingAdapter(makeDb(seed) as any);

    // Before the vault exists the plan delegates nothing
    expect(await adapter.getPlanBalanceAtTimestamp("voting-vesting-128", seconds(1_700n))).toBe(0n);
    // Funded amount from vault creation onward
    expect(await adapter.getPlanBalanceAtTimestamp("voting-vesting-128", seconds(2_500n))).toBe(1_000n);
    // Post-revocation the vested remainder keeps vesting in the vault
    expect(await adapter.getPlanBalanceAtTimestamp("voting-vesting-128", seconds(3_500n))).toBe(400n);

    const events = await adapter.getPlanBalanceEventsInRange(
      "voting-vesting-128",
      seconds(0n),
      seconds(10_000n),
    );
    expect(events.map((e) => [e.timestamp, e.balance])).toEqual([
      [2_000n, 1_000n],
      [3_000n, 400n],
    ]);
    expect(events.every((e) => e.planId === "voting-vesting-128")).toBe(true);
  });

  it("returns 0 for a voting-vesting plan with no vault at all", async () => {
    const db = makeDb({ voting_vesting_plan: [makeVotingVestingPlanRow({ id: 128n })] });
    const adapter = createVestingAdapter(db as any);
    expect(await adapter.getPlanBalanceAtTimestamp("voting-vesting-128", seconds(9_999n))).toBe(0n);
  });
});
