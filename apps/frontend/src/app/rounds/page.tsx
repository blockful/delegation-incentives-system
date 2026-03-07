"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { RoundStatusHeader } from "@/components/rounds/RoundStatusHeader";
import { RoundHistoryTable } from "@/components/rounds/RoundHistoryTable";
import { TierLadder } from "@/components/rounds/TierLadder";
import { Card } from "@/components/ui/Card";

export default function RoundsPage() {
  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-6">
        {/* Left column — round status + history */}
        <div className="lg:col-span-2 space-y-sp-6">
          <RoundStatusHeader />
          <RoundHistoryTable />
        </div>

        {/* Right column — tier ladder */}
        <div>
          <Card>
            <TierLadder />
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
