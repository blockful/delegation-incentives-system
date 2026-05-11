import type { DistributionResult } from "@ens-dis/domain";

/**
 * Replacer for JSON.stringify that converts BigInt values to decimal strings.
 * All Wei/Seconds/BlockNumber values will be serialized as "123456" strings.
 */
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

/**
 * Serialize a DistributionResult to JSON matching PRD Section 4 schema.
 *
 * - All BigInt values (Wei, Seconds, BlockNumber) are serialized as decimal strings.
 * - The output is pretty-printed with 2-space indentation.
 */
export function distributionToJson(result: DistributionResult): string {
  return JSON.stringify(result, bigintReplacer, 2);
}
