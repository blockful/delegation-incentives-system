import { getAppDb, walletAlias } from "../db/app-tables.js";
import type { WalletAliasRepository } from "@ens-dis/domain";
import type { Address, WalletAlias } from "@ens-dis/domain";

export function createWalletAliasAdapter(): WalletAliasRepository {
  return {
    async getAliases(): Promise<readonly WalletAlias[]> {
      // wallet_alias is curated by operators (see OPERATOR.md) and lives in
      // an app-owned table outside the Ponder schema — see src/db/app-tables.ts.
      const { db, ready } = getAppDb();
      await ready;
      const rows = await db.select().from(walletAlias);

      return rows.map((row) => ({
        secondary: row.secondaryAddress as Address,
        primary: row.primaryAddress as Address,
      }));
    },
  };
}
