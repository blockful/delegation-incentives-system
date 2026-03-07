"use client";

import { Card } from "@/components/ui/Card";
import { useDistribution } from "@/lib/queries";
import { currentMonth, formatNumber } from "@/lib/format";

export function PrizePoolDisplay() {
  const month = currentMonth();
  const { data } = useDistribution(month);

  const poolCount = data?.lotteryPools.length ?? 0;
  const totalEntries =
    data?.lotteryPools.reduce((sum, p) => sum + p.entries.length, 0) ?? 0;

  return (
    <Card className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Prize Per Pool
      </span>

      <span className="text-[40px] leading-tight font-black text-primary">
        ~10 ENS
      </span>

      <div className="flex flex-wrap gap-sp-4">
        <div>
          <span className="text-caption text-text-muted block">
            Active Pools
          </span>
          <span className="text-body font-bold text-text-primary">
            {poolCount}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">
            Qualifying Addresses
          </span>
          <span className="text-body font-bold text-text-primary">
            {formatNumber(totalEntries)}
          </span>
        </div>
      </div>
    </Card>
  );
}
