"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EarningsCard } from "@/components/dashboard/EarningsCard";
import { RoundProgressCard } from "@/components/dashboard/RoundProgressCard";
import { LotteryStatusCard } from "@/components/dashboard/LotteryStatusCard";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useMyApy } from "@/lib/queries";
import { formatEns, daysRemaining, formatMonth, currentMonth } from "@/lib/format";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { data: apy } = useMyApy();

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-6">
        {/* Left column - 2 cols wide */}
        <div className="lg:col-span-2">
          <EarningsCard />
        </div>

        {/* Right column */}
        <div className="space-y-sp-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-sp-4">
            <Card>
              <StatCard
                label="Balance"
                value={`${formatEns(apy?.currentBalanceEns ?? "0")} ENS`}
                description="180-day time-weighted"
              />
            </Card>
            <Card>
              <StatCard
                label="Round Ends"
                value={`${daysRemaining()}d`}
                description={formatMonth(currentMonth())}
              />
            </Card>
            <Card>
              <StatCard
                label="Pool Size"
                value={`${apy?.poolSizeEns ?? "0"} ENS`}
                description={`Tier ${(apy?.currentTierIndex ?? 0) + 1}`}
              />
            </Card>
          </div>

          <RoundProgressCard />
          <LotteryStatusCard />
        </div>
      </div>
    </PageContainer>
  );
}
