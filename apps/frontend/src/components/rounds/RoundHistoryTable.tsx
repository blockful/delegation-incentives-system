"use client";

import { useStatus, useDistribution } from "@/lib/queries";
import { formatEns, formatMonth } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccount } from "wagmi";

function RoundRow({
  month,
  index,
}: {
  month: string;
  index: number;
}) {
  const { data, isLoading, isError } = useDistribution(month);
  const { address } = useAccount();

  if (isError) return null; // Month doesn't exist — skip
  if (isLoading) {
    return (
      <tr>
        <td className="py-sp-3 pr-sp-4">
          <Skeleton className="h-4 w-16" />
        </td>
        <td className="py-sp-3 pr-sp-4">
          <Skeleton className="h-4 w-24" />
        </td>
        <td className="py-sp-3 pr-sp-4">
          <Skeleton className="h-4 w-20" />
        </td>
        <td className="py-sp-3">
          <Skeleton className="h-4 w-14" />
        </td>
      </tr>
    );
  }

  if (!data) return null;

  // Find user's payout in this distribution
  const userPayout = address
    ? data.directPayouts.find(
        (p) => p.address.toLowerCase() === address.toLowerCase(),
      )
    : null;

  const earned = userPayout ? `${formatEns(userPayout.amountEns, 4)} ENS` : "—";
  const isLive = month === currentMonthStr();

  return (
    <tr className="border-t border-border">
      <td className="py-sp-3 pr-sp-4 text-body-sm font-bold text-text-primary">
        Round {index + 1}
      </td>
      <td className="py-sp-3 pr-sp-4 text-body-sm text-text-body">
        {formatMonth(month)}
      </td>
      <td className="py-sp-3 pr-sp-4 text-body-sm text-text-primary font-bold">
        {earned}
      </td>
      <td className="py-sp-3">
        {isLive ? (
          <Badge variant="active">Live</Badge>
        ) : (
          <Badge variant="status">Paid</Badge>
        )}
      </td>
    </tr>
  );
}

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

export function RoundHistoryTable() {
  const months = getRecentMonths(6);

  return (
    <Card>
      <span className="text-label uppercase text-text-muted tracking-wider">
        Round History
      </span>
      <div className="mt-sp-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-caption text-text-muted">
              <th className="pb-sp-2 pr-sp-4 font-bold">Round</th>
              <th className="pb-sp-2 pr-sp-4 font-bold">Period</th>
              <th className="pb-sp-2 pr-sp-4 font-bold">Earned</th>
              <th className="pb-sp-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, i) => (
              <RoundRow key={month} month={month} index={months.length - 1 - i} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
