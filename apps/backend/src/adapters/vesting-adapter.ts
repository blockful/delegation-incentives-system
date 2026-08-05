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
 * Namespace prefix for VotingTokenLockupPlans plan IDs. Lockup and vesting
 * plan IDs are independent counters on two different contracts, so raw
 * numeric IDs would collide; the domain treats planId as an opaque string,
 * so the prefix routes each planId back to the right tables here.
 */
const LOCKUP_PLAN_ID_PREFIX = "lockup-";

function isLockupPlanId(planId: string): boolean {
  return planId.startsWith(LOCKUP_PLAN_ID_PREFIX);
}

function lockupPlanIdToBigInt(planId: string): bigint {
  return BigInt(planId.slice(LOCKUP_PLAN_ID_PREFIX.length));
}

export function createVestingAdapter(db: Db): VestingRepository {
  /**
   * All per-plan VotingVaults belonging to indexed (= ENS) lockup plans, as
   * vaultAddress → planId. Vault rows are written unconditionally by the
   * indexer (event-ordering constraint), so they must be joined against
   * lockup_plan to drop vaults of non-ENS plans.
   *
   * Deliberately includes vaults of fully-redeemed/burned plans: a vault's
   * ens_delegation row outlives its balance, and a vault that delegated at
   * month-end must still resolve through the hedgey leg (owner/balance
   * lookups then yield 0x0/0) rather than fall through to source:"direct" —
   * that fall-through is exactly the round-1 bug that credited 21 vaults
   * with 246 ENS.
   */
  async function getEnsLockupVaults(): Promise<Map<string, bigint>> {
    const vaultRows = await db.select().from(lockupVotingVault);
    if (vaultRows.length === 0) return new Map();

    const planRows = await db.select().from(lockupPlan);
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

      // Per-plan VotingVaults of the lockup contract — these are the
      // addresses that actually appear as DelegateChanged delegators.
      const lockupVaults = await getEnsLockupVaults();
      for (const vaultAddress of lockupVaults.keys()) {
        addresses.add(vaultAddress);
      }

      return [...addresses] as Address[];
    },

    async getNftOwnerAtTimestamp(
      planId: string,
      timestamp: Seconds,
    ): Promise<Address> {
      const [ownershipTable, numericPlanId] = isLockupPlanId(planId)
        ? [lockupNftOwnership, lockupPlanIdToBigInt(planId)]
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

      // Lockup leg: each requested address that is a per-plan VotingVault
      // maps to exactly one lockup plan, keyed to the VAULT address (the
      // vault is the on-chain delegator the pipeline matched against).
      const lockupVaults = await getEnsLockupVaults();
      const requestedVaultPlanIds = new Map<bigint, string>();
      for (const addr of lowerAddresses) {
        const planId = lockupVaults.get(addr);
        if (planId !== undefined) requestedVaultPlanIds.set(planId, addr);
      }

      if (requestedVaultPlanIds.size > 0) {
        const planRows = await db.select().from(lockupPlan);
        const vaultRows = await db.select().from(lockupVotingVault);
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
            planId: `${LOCKUP_PLAN_ID_PREFIX}${planId}`,
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
      if (isLockupPlanId(planId)) {
        const numericPlanId = lockupPlanIdToBigInt(planId);

        // Tokens only count toward the vault-delegated balance from vault
        // creation onward (the "vault_funded" balance event); pre-vault
        // events (e.g. early redemptions while tokens still sat undelegated
        // in the lockup contract) must not enter the TWB step function.
        const vaultRows = await db
          .select()
          .from(lockupVotingVault)
          .where(eq(lockupVotingVault.id, numericPlanId))
          .limit(1);
        if (vaultRows.length === 0) return [];
        const fundedAt = BigInt(vaultRows[0].createdAtTimestamp);

        const rows = await db
          .select()
          .from(lockupBalanceEvent)
          .where(
            and(
              eq(lockupBalanceEvent.planId, numericPlanId),
              gte(lockupBalanceEvent.timestamp, from),
              lte(lockupBalanceEvent.timestamp, to),
            ),
          )
          .orderBy(
            asc(lockupBalanceEvent.timestamp),
            asc(lockupBalanceEvent.blockNumber),
            asc(lockupBalanceEvent.logIndex),
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
      if (isLockupPlanId(planId)) {
        const numericPlanId = lockupPlanIdToBigInt(planId);

        // Before the vault exists the plan delegates nothing → balance 0.
        const vaultRows = await db
          .select()
          .from(lockupVotingVault)
          .where(eq(lockupVotingVault.id, numericPlanId))
          .limit(1);
        if (vaultRows.length === 0) return wei(0n);
        const fundedAt = BigInt(vaultRows[0].createdAtTimestamp);
        if (fundedAt > (timestamp as bigint)) return wei(0n);

        // From vault creation onward there is always a balance event at or
        // before `timestamp` (the "vault_funded" row written at creation).
        const eventRows = await db
          .select()
          .from(lockupBalanceEvent)
          .where(
            and(
              eq(lockupBalanceEvent.planId, numericPlanId),
              lte(lockupBalanceEvent.timestamp, timestamp),
              gte(lockupBalanceEvent.timestamp, seconds(fundedAt)),
            ),
          )
          .orderBy(
            desc(lockupBalanceEvent.timestamp),
            desc(lockupBalanceEvent.blockNumber),
            desc(lockupBalanceEvent.logIndex),
          )
          .limit(1);

        if (eventRows.length > 0) {
          return wei(BigInt(eventRows[0].planRemainder));
        }

        // Defensive fallback — should be unreachable given the funding row.
        const planRows = await db
          .select()
          .from(lockupPlan)
          .where(eq(lockupPlan.id, numericPlanId))
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
