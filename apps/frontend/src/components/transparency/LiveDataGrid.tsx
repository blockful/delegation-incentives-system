"use client";

import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useStatus, useTierProgression } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export function LiveDataGrid() {
  const { data: status } = useStatus();
  const { data: tiers } = useTierProgression();

  const currentTier = tiers?.tiers.find((t) => t.isCurrent);

  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Live Data
      </span>

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
    </div>
  );
}
