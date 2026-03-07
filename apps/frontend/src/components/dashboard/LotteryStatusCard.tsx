"use client";

import { Card } from "@/components/ui/Card";
import { useDistribution } from "@/lib/queries";
import { currentMonth } from "@/lib/format";
import { useAccount } from "wagmi";
import Link from "next/link";

export function LotteryStatusCard() {
  const { address } = useAccount();
  const { data: distribution } = useDistribution(currentMonth());

  // Find user in lottery pools
  let userPool: { poolIndex: number; odds: number } | null = null;

  if (distribution && address) {
    for (let i = 0; i < distribution.lotteryPools.length; i++) {
      const pool = distribution.lotteryPools[i];
      const found = pool.entries.find(
        (e) => e.address.toLowerCase() === address.toLowerCase(),
      );
      if (found) {
        userPool = {
          poolIndex: i + 1,
          odds: Math.round((1 / pool.entries.length) * 100 * 10) / 10,
        };
        break;
      }
    }
  }

  if (!userPool) return null;

  return (
    <Card className="space-y-sp-3">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-primary">Lottery</span>
        <Link
          href="/lottery"
          className="text-caption text-primary hover:underline"
        >
          Details &rarr;
        </Link>
      </div>
      <p className="text-body-sm text-text-body">
        You&apos;re in pool #{userPool.poolIndex} with ~{userPool.odds}% odds
      </p>
    </Card>
  );
}
