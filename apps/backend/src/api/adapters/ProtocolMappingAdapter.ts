import type { ProtocolMappingRepository, ProtocolMapping } from "@ens-dis/domain"
import { protocolMapping } from "ponder:schema"

export class ProtocolMappingAdapter implements ProtocolMappingRepository {
  constructor(private db: any) {}

  async getMappings(): Promise<ProtocolMapping[]> {
    const rows = await this.db
      .select()
      .from(protocolMapping)

    return rows.map((row: any) => ({
      childAddress: (row.childAddress as string).toLowerCase(),
      operatorAddress: (row.operatorAddress as string).toLowerCase(),
      protocol: row.protocol as string,
    }))
  }
}
