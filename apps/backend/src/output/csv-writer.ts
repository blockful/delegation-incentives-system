import type { DistributionResult } from "@ens-dis/domain";

const CSV_HEADER =
  "address,voter_reward,token_holder_reward,combined_reward,role,payout_type";

/**
 * Determine the role of a reward recipient based on their reward breakdown.
 */
function getRole(
  voterReward: bigint,
  tokenHolderReward: bigint,
): string {
  if (voterReward > 0n && tokenHolderReward > 0n) return "both";
  if (voterReward > 0n) return "voter";
  return "token_holder";
}

/**
 * Determine payout type. All recipients in the main rewards list
 * receive "direct" payouts. Lottery winners are separate.
 */
function getPayoutType(isLotteryWinner: boolean): string {
  return isLotteryWinner ? "lottery" : "direct";
}

/**
 * Escape a CSV field value. Wraps in quotes if the value contains
 * commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialize a DistributionResult to CSV format.
 *
 * Columns: address, voter_reward, token_holder_reward, combined_reward, role, payout_type
 *
 * - All Wei values are serialized as decimal strings.
 * - Includes both direct reward recipients and lottery winners.
 */
export function distributionToCsv(result: DistributionResult): string {
  const lines: string[] = [CSV_HEADER];

  // Collect lottery winners for lookup
  const lotteryWinners = new Set<string>();
  for (const bucket of result.lottery.buckets) {
    lotteryWinners.add(bucket.winner.toLowerCase());
  }

  // Direct reward recipients
  for (const reward of result.rewards) {
    lines.push(
      [
        escapeCsvField(reward.address),
        reward.voterReward.toString(),
        reward.tokenHolderReward.toString(),
        reward.total.toString(),
        getRole(reward.voterReward, reward.tokenHolderReward),
        getPayoutType(lotteryWinners.has(reward.address.toLowerCase())),
      ].join(","),
    );
  }

  // Lottery winners who are NOT already in the rewards list
  const rewardAddresses = new Set(
    result.rewards.map((r) => r.address.toLowerCase()),
  );

  for (const bucket of result.lottery.buckets) {
    if (!rewardAddresses.has(bucket.winner.toLowerCase())) {
      lines.push(
        [
          escapeCsvField(bucket.winner),
          "0",
          "0",
          bucket.prize.toString(),
          "token_holder",
          "lottery",
        ].join(","),
      );
    }
  }

  return lines.join("\n") + "\n";
}
