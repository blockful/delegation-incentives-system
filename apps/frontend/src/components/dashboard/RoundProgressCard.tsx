"use client";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { roundProgress, daysRemaining, formatMonth, currentMonth } from "@/lib/format";
import Link from "next/link";

export function RoundProgressCard() {
  const progress = roundProgress();
  const remaining = daysRemaining();
  const month = currentMonth();

  return (
    <Card className="space-y-sp-3">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-primary">
          {formatMonth(month)} · {progress}% complete
        </span>
        <Link
          href="/rounds"
          className="text-caption text-primary hover:underline"
        >
          View rounds &rarr;
        </Link>
      </div>
      <ProgressBar value={progress} />
      <span className="text-body-sm text-text-muted">
        {remaining} days remaining
      </span>
    </Card>
  );
}
