import type { db as PonderDb } from "ponder:api";
import { eq, inArray } from "drizzle-orm";
import { vestingPlan, protocolMapping } from "ponder:schema";
import type { VestingRepository } from "@ens-dis/domain";
import type { Address, Seconds, VestingPlan } from "@ens-dis/domain";
import { wei } from "@ens-dis/domain";

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
      _timestamp: Seconds,
    ): Promise<Address> {
      // The vestingPlan table tracks the current NFT holder via `recipient`.
      // Ponder reflects the latest indexed state.
      const rows = await db
        .select()
        .from(vestingPlan)
        .where(eq(vestingPlan.id, BigInt(planId)))
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`Vesting plan ${planId} not found`);
      }

      return rows[0].recipient as Address;
    },

    async getPlansForContracts(
      contractAddresses: readonly Address[],
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

      const rows = await db.select().from(vestingPlan);

      return rows.map((row) => ({
        planId: String(row.id),
        contractAddress: HEDGEY_VESTING_ADDRESS,
        token: row.token as Address,
        amount: wei(BigInt(row.amount)),
      }));
    },
  };
}
