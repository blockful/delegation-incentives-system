"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { LotteryHeader } from "@/components/lottery/LotteryHeader";
import { UserStatusCard } from "@/components/lottery/UserStatusCard";
import { PrizePoolDisplay } from "@/components/lottery/PrizePoolDisplay";
import { HowDrawWorks } from "@/components/lottery/HowDrawWorks";

export default function LotteryPage() {
  return (
    <PageContainer>
      <div className="space-y-sp-8">
        <LotteryHeader />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-sp-6">
          <UserStatusCard />
          <PrizePoolDisplay />
        </div>

        <HowDrawWorks />
      </div>
    </PageContainer>
  );
}
