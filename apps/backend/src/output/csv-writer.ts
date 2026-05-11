import type { DistributionResult } from "@ens-dis/domain";

const CSV_HEADER =
  "address,delegate_reward,delegator_reward,combined_reward,role,payout_type";

/**
 * Determine the role of a reward recipient based on their reward breakdown.
 */
function getRole(
  delegateReward: bigint,
  delegatorReward: bigint,
): string {
  if (delegateReward > 0n && delegatorReward > 0n) return "both";
  if (delegateReward > 0n) return "delegate";
  return "delegator";
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
 * Columns: address, delegate_reward, delegator_reward, combined_reward, role, payout_type
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
        reward.delegateReward.toString(),
        reward.delegatorReward.toString(),
        reward.total.toString(),
        getRole(reward.delegateReward, reward.delegatorReward),
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
          "delegator",
          "lottery",
        ].join(","),
      );
    }
  }

  return lines.join("\n") + "\n";
}
