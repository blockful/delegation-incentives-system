"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDistribution } from "@/lib/queries";
import { currentMonth, formatEns, daysRemaining } from "@/lib/format";
import { useAccount } from "wagmi";
import { Skeleton } from "@/components/ui/Skeleton";
import type { LotteryPool } from "@/types/api";

export function UserStatusCard() {
  const { address } = useAccount();
  const month = currentMonth();
  const { data, isLoading } = useDistribution(month);

  if (!address) {
    return (
      <Card className="space-y-sp-3">
        <span className="text-label uppercase text-text-muted tracking-wider">
          Your Status
        </span>
        <p className="text-body text-text-body">
          Connect your wallet to see your lottery status.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="space-y-sp-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }

  // Find user in lottery pools
  let userPoolIndex: number | null = null;
  let userPool: LotteryPool | null = null;

  if (data) {
    for (let i = 0; i < data.lotteryPools.length; i++) {
      const pool = data.lotteryPools[i];
      const found = pool.entries.find(
        (e) => e.address.toLowerCase() === address.toLowerCase(),
      );
      if (found) {
        userPoolIndex = i;
        userPool = pool;
        break;
      }
    }
  }

  if (!userPool || userPoolIndex === null) {
    return (
      <Card className="space-y-sp-3">
        <span className="text-label uppercase text-text-muted tracking-wider">
          Your Status
        </span>
        <p className="text-body-sm text-text-body">
          You&apos;re not in the lottery this round. Delegators earning less than
          1 ENS/month qualify automatically.
        </p>
      </Card>
    );
  }

  const entryCount = userPool.entries.length;
  const odds = ((1 / entryCount) * 100).toFixed(1);

  return (
    <Card className="space-y-sp-4">
      <div className="flex items-center justify-between">
        <span className="text-label uppercase text-text-muted tracking-wider">
          Your Status
        </span>
        <Badge variant="active">Qualified</Badge>
      </div>

      <div>
        <span className="text-h2 text-text-primary">
          Pool #{userPoolIndex + 1}
        </span>
        <p className="text-body-sm text-text-muted mt-sp-1">
          ~{odds}% chance of winning
        </p>
      </div>

      <div className="flex flex-wrap gap-sp-4">
        <div>
          <span className="text-caption text-text-muted block">
            Pool Prize
          </span>
          <span className="text-body font-bold text-text-primary">
            {formatEns(userPool.totalPrizeEns)} ENS
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">
            Entries
          </span>
          <span className="text-body font-bold text-text-primary">
            {entryCount}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">
            Draw In
          </span>
          <span className="text-body font-bold text-text-primary">
            {daysRemaining()}d
          </span>
        </div>
      </div>
    </Card>
  );
}
