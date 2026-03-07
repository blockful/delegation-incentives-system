"use client";

import { useTierProgression } from "@/lib/queries";
import { roundProgress, daysRemaining, formatNumber } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function LiveRoundBar() {
  const { data: tiers } = useTierProgression();
  const progress = roundProgress();
  const remaining = daysRemaining();

  const currentTier = tiers?.tiers.find((t) => t.isCurrent);
  const growthPct = tiers?.currentGrowthPct ?? "0";

  return (
    <div className="rounded-r12 border border-border bg-surface p-sp-5">
      <div className="flex flex-wrap items-center justify-between gap-sp-4 mb-sp-3">
        <div className="flex items-center gap-sp-2">
          <span className="inline-flex items-center gap-1.5 text-caption text-success">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live Round
          </span>
        </div>
        <span className="text-body-sm text-text-muted">
          {remaining}d remaining
        </span>
      </div>

      <ProgressBar value={progress} />

      <div className="mt-sp-4 grid grid-cols-2 md:grid-cols-4 gap-sp-4">
        <div>
          <span className="text-label uppercase text-text-muted tracking-wider block">
            Growth
          </span>
          <span className="text-h3 text-text-primary">{growthPct}%</span>
        </div>
        <div>
          <span className="text-label uppercase text-text-muted tracking-wider block">
            Tier
          </span>
          <span className="text-h3 text-text-primary">
            {currentTier ? currentTier.index + 1 : "—"}
          </span>
        </div>
        <div>
          <span className="text-label uppercase text-text-muted tracking-wider block">
            Pool Size
          </span>
          <span className="text-h3 text-text-primary">
            {currentTier ? `${formatNumber(currentTier.poolSizeEns)} ENS` : "—"}
          </span>
        </div>
        <div>
          <span className="text-label uppercase text-text-muted tracking-wider block">
            Delegates
          </span>
          <span className="text-h3 text-text-primary">
            {tiers?.activeDelegateCount ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
