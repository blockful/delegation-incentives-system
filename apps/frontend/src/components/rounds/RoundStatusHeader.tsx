"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { useMyApy, useTierProgression } from "@/lib/queries";
import {
  roundProgress,
  daysRemaining,
  formatMonth,
  currentMonth,
  formatEns,
  formatPct,
} from "@/lib/format";

export function RoundStatusHeader() {
  const progress = roundProgress();
  const remaining = daysRemaining();
  const month = currentMonth();
  const { data: apy } = useMyApy();
  const { data: tiers } = useTierProgression();

  // Determine round number (placeholder — first round = 1)
  const roundNumber = 1;

  return (
    <div className="space-y-sp-6">
      <div>
        <div className="flex items-center gap-sp-3">
          <h1 className="text-h1 text-text-primary">
            Round {roundNumber} is
          </h1>
          <Badge variant="active">live</Badge>
        </div>
        <p className="mt-sp-2 text-body text-text-body max-w-lg">
          Rewards accrue daily based on your 180-day time-weighted balance.
          Payouts happen at the end of each calendar month.
        </p>
      </div>

      <div className="space-y-sp-2">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>{formatMonth(month)}</span>
          <span>{remaining}d remaining</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="flex flex-wrap gap-sp-4">
        <div>
          <span className="text-caption text-text-muted block">Pool Size</span>
          <span className="text-h3 text-text-primary">
            {apy ? `${formatEns(apy.poolSizeEns)} ENS` : "—"}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Your Tier</span>
          <span className="text-h3 text-text-primary">
            {tiers ? `Tier ${tiers.currentTierIndex + 1}` : "—"}
          </span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">
            Current APY
          </span>
          <span className="text-h3 text-text-primary">
            {apy ? formatPct(apy.estimatedApyPct) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
