"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useMyApy, useMyEligibility } from "@/lib/queries";
import {
  formatEns,
  formatPct,
  daysRemaining,
  roundProgress,
  truncateAddress,
} from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEnsProfiles } from "@/lib/hooks/useEnsProfiles";

export function EarningsCard() {
  const { data: apy, isLoading: apyLoading } = useMyApy();
  const { data: eligibility } = useMyEligibility();
  const delegateAddr = eligibility?.delegatedTo ?? "";
  const { data: profiles } = useEnsProfiles(
    delegateAddr ? [delegateAddr] : [],
  );
  const delegateName =
    profiles?.get(delegateAddr.toLowerCase())?.name ??
    (delegateAddr ? truncateAddress(delegateAddr) : null);

  // Interpolate current earnings: estimatedMonthly × (progress / 100)
  const progress = roundProgress();
  const monthlyReward = parseFloat(apy?.estimatedMonthlyRewardEns ?? "0");
  const earnedSoFar = monthlyReward * (progress / 100);

  if (apyLoading) {
    return (
      <Card className="space-y-sp-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }

  return (
    <Card className="space-y-sp-5">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Your Earnings
      </span>

      <div>
        <span className="text-[40px] leading-tight font-black text-success">
          +{formatEns(earnedSoFar, 4)}
        </span>
        <p className="text-body-sm text-text-body mt-sp-1">
          ENS earned so far this round
        </p>
      </div>

      <div className="flex items-center gap-sp-2">
        <span className="text-body-sm text-text-body">
          Earning at{" "}
          <span className="font-bold text-text-primary">
            {formatPct(apy?.estimatedApyPct ?? "0")} APY
          </span>
        </span>
        <Badge variant="tier" selected>
          {(apy?.currentTierIndex ?? 0) + 1}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-sp-2">
        {delegateName && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-rFull bg-surface text-body-sm text-text-body">
            Delegating to {delegateName}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-rFull bg-surface text-body-sm text-text-body">
          {daysRemaining()}d left
        </span>
      </div>
    </Card>
  );
}
