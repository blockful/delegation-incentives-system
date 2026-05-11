import type { db as PonderDb } from "ponder:api";
import { walletAlias } from "ponder:schema";
import type { WalletAliasRepository } from "@ens-dis/domain";
import type { Address, WalletAlias } from "@ens-dis/domain";

type Db = typeof PonderDb;

export function createWalletAliasAdapter(db: Db): WalletAliasRepository {
  return {
    async getAliases(): Promise<readonly WalletAlias[]> {
      // Read wallet aliases from the Ponder table (curated via offchain writes)
      const rows = await db.select().from(walletAlias);

      return rows.map((row) => ({
        secondary: row.secondaryAddress as Address,
        primary: row.primaryAddress as Address,
      }));
    },
  };
}
