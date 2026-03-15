import type { ProtocolMappingRepository, ProtocolMapping } from "@ens-dis/domain"
import type { PonderDb, Row } from "./types.js"

export class ProtocolMappingAdapter implements ProtocolMappingRepository {
  constructor(private db: PonderDb) {}

  async getMappings(): Promise<ProtocolMapping[]> {
    const rows = await this.db
      .select()
      .from("protocol_mapping")

    return rows.map((row: Row) => ({
      childAddress: (row["childAddress"] as string).toLowerCase(),
      operatorAddress: (row["operatorAddress"] as string).toLowerCase(),
      protocol: row["protocol"] as string,
    }))
  }
}
