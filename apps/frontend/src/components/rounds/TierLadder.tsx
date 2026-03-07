"use client";

import { useTierProgression } from "@/lib/queries";
import { formatNumber, formatPct } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export function TierLadder() {
  const { data, isLoading } = useTierProgression();

  if (isLoading) {
    return (
      <div className="space-y-sp-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-sp-1">
      <div className="flex items-baseline justify-between mb-sp-4">
        <span className="text-label uppercase text-text-muted tracking-wider">
          APY Tiers
        </span>
        <span className="text-caption text-text-muted">
          Growth: {data.currentGrowthPct}%
        </span>
      </div>

      {data.tiers.map((tier) => {
        const isCurrent = tier.isCurrent;
        const isUnlocked = tier.isUnlocked;
        const tierNum = tier.index + 1;
        const poolEns = parseFloat(tier.poolSizeEns);

        // Calculate approximate APY: poolSizeEns * 12 / totalAVP-ish (simplified display)
        const growthLabel =
          tier.momGrowthMaxPct === "1000000"
            ? `${tier.momGrowthMinPct}%+`
            : `${tier.momGrowthMinPct}–${tier.momGrowthMaxPct}%`;

        return (
          <div
            key={tier.index}
            className={cn(
              "flex items-center gap-sp-3 px-sp-4 py-sp-3 rounded-r8 transition-colors",
              isCurrent
                ? "bg-primary/5 border-l-4 border-l-primary"
                : isUnlocked
                  ? "bg-surface"
                  : "bg-white opacity-60",
            )}
          >
            {/* Tier number */}
            <span
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold",
                isCurrent
                  ? "bg-primary text-white"
                  : isUnlocked
                    ? "bg-surface border border-border text-text-primary"
                    : "bg-white border border-border text-text-muted",
              )}
            >
              {tierNum}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "text-body-sm font-bold",
                    isCurrent ? "text-primary" : "text-text-primary",
                  )}
                >
                  Tier {tierNum}
                </span>
                <span className="text-body-sm font-bold text-text-primary">
                  {formatNumber(poolEns)} ENS
                </span>
              </div>
              <span className="text-caption text-text-muted">
                {growthLabel} MoM growth
              </span>
            </div>

            {/* Lock/unlock icon */}
            <span className="flex-shrink-0 text-text-muted">
              {isUnlocked ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 7V5a4 4 0 018 0v2m-8 0h8a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M11 7V5a3 3 0 00-6 0v2m-1 0h8a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
