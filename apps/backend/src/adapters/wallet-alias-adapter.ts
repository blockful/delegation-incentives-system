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

      // Aliases are matched by exact string against lowercase indexer
      // addresses (consolidateTokenHolders builds a Map keyed on them), so a
      // checksummed row curated by an operator would silently never match —
      // reopening the per-wallet cap evasion the alias exists to close.
      // Normalize both sides here.
      return rows.map((row) => ({
        secondary: row.secondaryAddress.toLowerCase() as Address,
        primary: row.primaryAddress.toLowerCase() as Address,
      }));
    },
  };
}
