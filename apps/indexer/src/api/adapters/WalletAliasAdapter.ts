import type { WalletAliasRepository, WalletAlias } from "@ens-dis/domain"
import { walletAlias } from "ponder:schema"

export class WalletAliasAdapter implements WalletAliasRepository {
  constructor(private db: any) {}

  async getAliases(): Promise<WalletAlias[]> {
    const rows = await this.db
      .select()
      .from(walletAlias)

    return rows.map((row: any) => ({
      secondaryAddress: (row.secondaryAddress as string).toLowerCase(),
      primaryAddress: (row.primaryAddress as string).toLowerCase(),
      source: (row.source as string) ?? "manual",
    }))
  }
}
