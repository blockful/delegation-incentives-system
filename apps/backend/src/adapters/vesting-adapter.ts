import type { db as PonderDb } from "ponder:api";
import { and, eq, lte, gte, desc, asc } from "drizzle-orm";
import {
  vestingPlan,
  vestingNftOwnership,
  vestingRedemption,
  protocolMapping,
  lockupPlan,
  lockupVotingVault,
  lockupNftOwnership,
  lockupBalanceEvent,
  votingVestingPlan,
  votingVestingVault,
  votingVestingNftOwnership,
  votingVestingBalanceEvent,
} from "ponder:schema";
import type { VestingRepository } from "@ens-dis/domain";
import type {
  Address,
  Seconds,
  VestingBalanceEvent,
  VestingPlan,
  Wei,
} from "@ens-dis/domain";
import { wei, seconds, blockNumber } from "@ens-dis/domain";

type Db = typeof PonderDb;

/**
 * The Hedgey vesting master contract address (TokenVestingPlans).
 * This single contract holds tokens for all vesting plans.
 */
const HEDGEY_VESTING_ADDRESS: Address =
  "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";

/**
 * A "vault leg": a Hedgey contract whose voting-enabled plans custody their
 * tokens in dedicated per-plan VotingVaults — the vault, not the contract,
 * is the on-chain DelegateChanged delegator, so vaults must resolve to
 * plan-NFT owners. Two such contracts exist:
 *
 * - VotingTokenLockupPlans  (0x73cD…Ec3D) → tables lockup_*,        prefix "lockup-"
 * - VotingTokenVestingPlans (0x1bb6…Ef82) → tables voting_vesting_*, prefix "voting-vesting-"
 *
 * Plan IDs are independent NFT counters on each contract (and on the vesting
 * master, whose plans keep un-prefixed numeric IDs), so raw numeric IDs would
 * collide; the domain treats planId as an opaque string, so each leg's prefix
 * routes a planId back to the right tables here.
 */
const VAULT_LEGS = [
  {
    prefix: "lockup-",
    plan: lockupPlan,
    vault: lockupVotingVault,
    ownership: lockupNftOwnership,
    balanceEvent: lockupBalanceEvent,
  },
  {
    prefix: "voting-vesting-",
    plan: votingVestingPlan,
    vault: votingVestingVault,
    ownership: votingVestingNftOwnership,
    balanceEvent: votingVestingBalanceEvent,
  },
] as const;

type VaultLeg = (typeof VAULT_LEGS)[number];

function legForPlanId(planId: string): VaultLeg | undefined {
  return VAULT_LEGS.find((leg) => planId.startsWith(leg.prefix));
}

function legPlanIdToBigInt(leg: VaultLeg, planId: string): bigint {
  return BigInt(planId.slice(leg.prefix.length));
}

export function createVestingAdapter(db: Db): VestingRepository {
  /**
   * All per-plan VotingVaults belonging to a leg's indexed (= ENS) plans, as
   * vaultAddress → planId. Vault rows are written unconditionally by the
   * indexer (event-ordering constraint on the lockup leg; non-ENS plans on
   * both), so they must be joined against the leg's plan table to drop
   * vaults of non-ENS plans.
   *
   * Deliberately includes vaults of fully-redeemed/revoked/burned plans: a
   * vault's ens_delegation row outlives its balance, and a vault that
   * delegated at month-end must still resolve through the hedgey leg
   * (owner/balance lookups then yield 0x0/0) rather than fall through to
   * source:"direct" — that fall-through is exactly the round-1 bug that
   * credited 21 lockup vaults with 246 ENS.
   */
  async function getEnsVaults(leg: VaultLeg): Promise<Map<string, bigint>> {
    const vaultRows = await db.select().from(leg.vault);
    if (vaultRows.length === 0) return new Map();

    const planRows = await db.select().from(leg.plan);
    const ensPlanIds = new Set(planRows.map((p) => BigInt(p.id)));

    const vaults = new Map<string, bigint>();
    for (const v of vaultRows) {
      const planId = BigInt(v.id);
      if (!ensPlanIds.has(planId)) continue;
      vaults.set(v.vaultAddress.toLowerCase(), planId);
    }
    return vaults;
  }

  return {
    async getVestingContractAddresses(): Promise<readonly Address[]> {
      // Start with the known Hedgey master contract
      const addresses = new Set<string>([HEDGEY_VESTING_ADDRESS]);

      // Also check protocolMapping for any addresses tagged as hedgey_vesting
      const mappings = await db
        .select()
        .from(protocolMapping)
        .where(eq(protocolMapping.protocol, "hedgey_vesting"));

      for (const m of mappings) {
        addresses.add(m.childAddress.toLowerCase());
      }

      // Per-plan VotingVaults of the lockup and voting-vesting contracts —
      // these are the addresses that actually appear as DelegateChanged
      // delegators.
      for (const leg of VAULT_LEGS) {
        const vaults = await getEnsVaults(leg);
        for (const vaultAddress of vaults.keys()) {
          addresses.add(vaultAddress);
        }
      }

      return [...addresses] as Address[];
    },

    async getNftOwnerAtTimestamp(
      planId: string,
      timestamp: Seconds,
    ): Promise<Address> {
      const leg = legForPlanId(planId);
      const [ownershipTable, numericPlanId] = leg
        ? [leg.ownership, legPlanIdToBigInt(leg, planId)]
        : [vestingNftOwnership, BigInt(planId)];

      const rows = await db
        .select()
        .from(ownershipTable)
        .where(
          and(
            eq(ownershipTable.planId, numericPlanId),
            lte(ownershipTable.timestamp, timestamp),
          ),
        )
        .orderBy(
          desc(ownershipTable.timestamp),
          desc(ownershipTable.blockNumber),
          desc(ownershipTable.logIndex),
        )
        .limit(1);

      if (rows.length === 0) {
        return "0x0000000000000000000000000000000000000000";
      }

      return rows[0].owner as Address;
    },

    async getPlansForContracts(
      contractAddresses: readonly Address[],
      atTimestamp?: Seconds,
    ): Promise<readonly VestingPlan[]> {
      if (contractAddresses.length === 0) return [];

      const lowerAddresses = contractAddresses.map((a) => a.toLowerCase());
      const results: VestingPlan[] = [];

      // Vesting leg: all vesting plans live on the single master contract,
      // keyed to the master address.
      if (lowerAddresses.includes(HEDGEY_VESTING_ADDRESS)) {
        const planQuery = db.select().from(vestingPlan);
        const rows = atTimestamp === undefined
          ? await planQuery
          : await planQuery.where(lte(vestingPlan.createdAtTimestamp, atTimestamp));

        for (const row of rows) {
          results.push({
            planId: String(row.id),
            contractAddress: HEDGEY_VESTING_ADDRESS,
            token: row.token as Address,
            amount: wei(BigInt(row.amount)),
            createdAtTimestamp: seconds(BigInt(row.createdAtTimestamp)),
          });
        }
      }

      // Vault legs: each requested address that is a per-plan VotingVault
      // maps to exactly one plan, keyed to the VAULT address (the vault is
      // the on-chain delegator the pipeline matched against).
      for (const leg of VAULT_LEGS) {
        const vaults = await getEnsVaults(leg);
        const requestedVaultPlanIds = new Map<bigint, string>();
        for (const addr of lowerAddresses) {
          const planId = vaults.get(addr);
          if (planId !== undefined) requestedVaultPlanIds.set(planId, addr);
        }
        if (requestedVaultPlanIds.size === 0) continue;

        const planRows = await db.select().from(leg.plan);
        const vaultRows = await db.select().from(leg.vault);
        const vaultCreatedAt = new Map(
          vaultRows.map((v) => [BigInt(v.id), BigInt(v.createdAtTimestamp)]),
        );

        for (const row of planRows) {
          const planId = BigInt(row.id);
          const vaultAddress = requestedVaultPlanIds.get(planId);
          if (vaultAddress === undefined) continue;
          if (
            atTimestamp !== undefined &&
            BigInt(row.createdAtTimestamp) > (atTimestamp as bigint)
          ) {
            continue;
          }
          // The plan only becomes a delegating token holder once its vault
          // exists (and is funded) — a vault created after the reference
          // timestamp did not delegate at that time.
          const fundedAt = vaultCreatedAt.get(planId);
          if (
            atTimestamp !== undefined &&
            fundedAt !== undefined &&
            fundedAt > (atTimestamp as bigint)
          ) {
            continue;
          }

          results.push({
            planId: `${leg.prefix}${planId}`,
            contractAddress: vaultAddress as Address,
            token: row.token as Address,
            amount: wei(BigInt(row.amount)),
            createdAtTimestamp: seconds(BigInt(row.createdAtTimestamp)),
          });
        }
      }

      return results;
    },

    async getPlanBalanceEventsInRange(
      planId: string,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly VestingBalanceEvent[]> {
      const leg = legForPlanId(planId);
      if (leg) {
        const numericPlanId = legPlanIdToBigInt(leg, planId);

        // Tokens only count toward the vault-delegated balance from vault
        // creation onward (the "vault_funded" balance event); pre-vault
        // events (e.g. early redemptions while tokens still sat undelegated
        // in the plan contract) must not enter the TWB step function.
        const vaultRows = await db
          .select()
          .from(leg.vault)
          .where(eq(leg.vault.id, numericPlanId))
          .limit(1);
        if (vaultRows.length === 0) return [];
        const fundedAt = BigInt(vaultRows[0].createdAtTimestamp);

        const rows = await db
          .select()
          .from(leg.balanceEvent)
          .where(
            and(
              eq(leg.balanceEvent.planId, numericPlanId),
              gte(leg.balanceEvent.timestamp, from),
              lte(leg.balanceEvent.timestamp, to),
            ),
          )
          .orderBy(
            asc(leg.balanceEvent.timestamp),
            asc(leg.balanceEvent.blockNumber),
            asc(leg.balanceEvent.logIndex),
          );

        return rows
          .filter((row) => BigInt(row.timestamp) >= fundedAt)
          .map((row) => ({
            planId,
            balance: wei(BigInt(row.planRemainder)),
            timestamp: seconds(BigInt(row.timestamp)),
            blockNumber: blockNumber(BigInt(row.blockNumber)),
            logIndex: row.logIndex,
          }));
      }

      const rows = await db
        .select()
        .from(vestingRedemption)
        .where(
          and(
            eq(vestingRedemption.planId, BigInt(planId)),
            gte(vestingRedemption.timestamp, from),
            lte(vestingRedemption.timestamp, to),
          ),
        )
        .orderBy(
          asc(vestingRedemption.timestamp),
          asc(vestingRedemption.blockNumber),
          asc(vestingRedemption.logIndex),
        );

      return rows.map((row) => ({
        planId,
        balance: wei(BigInt(row.planRemainder)),
        timestamp: seconds(BigInt(row.timestamp)),
        blockNumber: blockNumber(BigInt(row.blockNumber)),
        logIndex: row.logIndex,
      }));
    },

    async getPlanBalanceAtTimestamp(
      planId: string,
      timestamp: Seconds,
    ): Promise<Wei> {
      const leg = legForPlanId(planId);
      if (leg) {
        const numericPlanId = legPlanIdToBigInt(leg, planId);

        // Before the vault exists the plan delegates nothing → balance 0.
        const vaultRows = await db
          .select()
          .from(leg.vault)
          .where(eq(leg.vault.id, numericPlanId))
          .limit(1);
        if (vaultRows.length === 0) return wei(0n);
        const fundedAt = BigInt(vaultRows[0].createdAtTimestamp);
        if (fundedAt > (timestamp as bigint)) return wei(0n);

        // From vault creation onward there is always a balance event at or
        // before `timestamp` (the "vault_funded" row written at creation).
        const eventRows = await db
          .select()
          .from(leg.balanceEvent)
          .where(
            and(
              eq(leg.balanceEvent.planId, numericPlanId),
              lte(leg.balanceEvent.timestamp, timestamp),
              gte(leg.balanceEvent.timestamp, seconds(fundedAt)),
            ),
          )
          .orderBy(
            desc(leg.balanceEvent.timestamp),
            desc(leg.balanceEvent.blockNumber),
            desc(leg.balanceEvent.logIndex),
          )
          .limit(1);

        if (eventRows.length > 0) {
          return wei(BigInt(eventRows[0].planRemainder));
        }

        // Defensive fallback — should be unreachable given the funding row.
        const planRows = await db
          .select()
          .from(leg.plan)
          .where(eq(leg.plan.id, numericPlanId))
          .limit(1);
        if (planRows.length === 0) return wei(0n);
        return wei(BigInt(planRows[0].remainder));
      }

      const planRows = await db
        .select()
        .from(vestingPlan)
        .where(eq(vestingPlan.id, BigInt(planId)))
        .limit(1);

      if (planRows.length === 0) return wei(0n);

      const plan = planRows[0];
      if (BigInt(plan.createdAtTimestamp) > (timestamp as bigint)) {
        return wei(0n);
      }

      const redemptionRows = await db
        .select()
        .from(vestingRedemption)
        .where(
          and(
            eq(vestingRedemption.planId, BigInt(planId)),
            lte(vestingRedemption.timestamp, timestamp),
          ),
        )
        .orderBy(
          desc(vestingRedemption.timestamp),
          desc(vestingRedemption.blockNumber),
          desc(vestingRedemption.logIndex),
        )
        .limit(1);

      if (redemptionRows.length > 0) {
        return wei(BigInt(redemptionRows[0].planRemainder));
      }

      return wei(BigInt(plan.amount));
    },
  };
}
