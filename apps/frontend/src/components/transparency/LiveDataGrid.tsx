"use client";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStatus, useTierProgression } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export function LiveDataGrid() {
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: tiers, isLoading: tiersLoading } = useTierProgression();
  const isLoading = statusLoading || tiersLoading;

  const currentTier = tiers?.tiers.find((t) => t.isCurrent);

  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Live Data
      </span>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-sp-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-sp-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sp-4">
        <Card>
          <StatCard
            label="Active Delegates"
            value={status ? String(status.activeDelegateCount) : "—"}
            description="Participating in governance"
          />
        </Card>
        <Card>
          <StatCard
            label="Current Tier"
            value={tiers ? `Tier ${tiers.currentTierIndex + 1}` : "—"}
            description={
              tiers ? `${tiers.currentGrowthPct}% MoM growth` : ""
            }
          />
        </Card>
        <Card>
          <StatCard
            label="Pool Size"
            value={
              currentTier
                ? `${formatNumber(currentTier.poolSizeEns)} ENS`
                : "—"
            }
            description="Monthly reward pool"
          />
        </Card>
        <Card>
          <StatCard
            label="Proposals"
            value={status ? String(status.proposalCount) : "—"}
            description="Tracked proposals"
          />
        </Card>
      </div>
      )}
    </div>
  );
}
