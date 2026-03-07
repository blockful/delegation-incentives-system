import { stringify } from "csv-stringify/sync";
import { type DistributionResult } from "@/domain/types.js";
import { weiToEnsString, bigintToString } from "./format.js";

/**
 * Generate a CSV string from distribution results.
 * Columns: address, amount_wei, amount_ens, role, type
 */
export function distributionToCsv(result: DistributionResult): string {
  const rows: string[][] = [];

  // Direct payouts
  for (const payout of result.directPayouts) {
    rows.push([
      payout.address,
      bigintToString(payout.amount),
      weiToEnsString(payout.amount),
      payout.role,
      "direct",
    ]);
  }

  // Lottery winners
  for (const pool of result.lotteryPools) {
    rows.push([
      pool.winner,
      bigintToString(pool.totalPrize),
      weiToEnsString(pool.totalPrize),
      pool.entries.find((e) => e.address === pool.winner)?.role ?? "delegator",
      "lottery_winner",
    ]);
  }

  return stringify(rows, {
    header: true,
    columns: ["address", "amount_wei", "amount_ens", "role", "type"],
  });
}
