import type { WalletAliasRepository, WalletAlias } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class WalletAliasAdapter implements WalletAliasRepository {
  constructor(private db: PonderDb) {}

  async getAliases(): Promise<WalletAlias[]> {
    const rows = await this.db
      .select()
      .from("wallet_alias")

    return rows.map((row: Row) => ({
      secondaryAddress: (row["secondaryAddress"] as string).toLowerCase(),
      primaryAddress: (row["primaryAddress"] as string).toLowerCase(),
      source: (row["source"] as string) ?? "manual",
    }))
  }
}
