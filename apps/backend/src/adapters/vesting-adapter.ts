import type { db as PonderDb } from "ponder:api";
import { and, eq, lte, gte, desc, asc } from "drizzle-orm";
import {
  vestingPlan,
  vestingNftOwnership,
  vestingRedemption,
  protocolMapping,
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
 * The Hedgey vesting master contract address.
 * This single contract holds tokens for all vesting plans.
 */
const HEDGEY_VESTING_ADDRESS: Address =
  "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";

export function createVestingAdapter(db: Db): VestingRepository {
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

      return [...addresses] as Address[];
    },

    async getNftOwnerAtTimestamp(
      planId: string,
      timestamp: Seconds,
    ): Promise<Address> {
      const rows = await db
        .select()
        .from(vestingNftOwnership)
        .where(
          and(
            eq(vestingNftOwnership.planId, BigInt(planId)),
            lte(vestingNftOwnership.timestamp, timestamp),
          ),
        )
        .orderBy(
          desc(vestingNftOwnership.timestamp),
          desc(vestingNftOwnership.blockNumber),
          desc(vestingNftOwnership.logIndex),
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

      // All vesting plans are associated with the Hedgey master contract.
      // The token field indicates which token is being vested.
      // Since all plans come from the same contract, we just return all ENS plans.
      // Filter by checking if any of the contractAddresses matches the Hedgey address.
      const lowerAddresses = contractAddresses.map((a) => a.toLowerCase());

      if (!lowerAddresses.includes(HEDGEY_VESTING_ADDRESS)) {
        return [];
      }

      const planQuery = db.select().from(vestingPlan);
      const rows = atTimestamp === undefined
        ? await planQuery
        : await planQuery.where(lte(vestingPlan.createdAtTimestamp, atTimestamp));

      return rows.map((row) => ({
        planId: String(row.id),
        contractAddress: HEDGEY_VESTING_ADDRESS,
        token: row.token as Address,
        amount: wei(BigInt(row.amount)),
        createdAtTimestamp: seconds(BigInt(row.createdAtTimestamp)),
      }));
    },

    async getPlanBalanceEventsInRange(
      planId: string,
      from: Seconds,
      to: Seconds,
    ): Promise<readonly VestingBalanceEvent[]> {
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
