import { useCallback } from "react";
import { Typography, Card, Spinner } from "@/components/atoms";
import { StatCard, TierProgress } from "@/components/molecules";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/api";
import type { TierProgressionResponse } from "@/api";
import { space } from "@/theme";
import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["5"],
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: space["5"],
};

function formatGrowth(bps: string): string {
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

export function TiersPage() {
  const tiersFn = useCallback(() => api.tierProgression(), []);
  const tiers = useAsync<TierProgressionResponse>(tiersFn);

  return (
    <div style={sectionStyle}>
      <div>
        <Typography variant="headingTwo" weight="extraBold">
          Pool Tiers
        </Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: space["2"] }}>
          Reward pool size is determined by month-over-month aggregate voting power growth.
        </Typography>
      </div>

      {tiers.loading && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: space["3"], justifyContent: "center", padding: space["8"] }}>
            <Spinner />
            <Typography color="secondary">Loading tier data...</Typography>
          </div>
        </Card>
      )}

      {tiers.error && (
        <Card>
          <Typography color="red">Error: {tiers.error}</Typography>
        </Card>
      )}

      {!tiers.loading && tiers.data && (
        <>
          <div style={gridStyle}>
            <StatCard
              label="Current MoM Growth"
              value={formatGrowth(tiers.data.currentGrowthBps)}
              data-testid="stat-growth"
            />
            <StatCard
              label="Active Delegates"
              value={tiers.data.activeDelegateCount}
              data-testid="stat-delegates"
            />
            <StatCard
              label="Current Tier"
              value={`Tier ${tiers.data.currentTierIndex + 1}`}
              data-testid="stat-tier"
            />
          </div>

          <Card>
            <Typography variant="headingFour" weight="bold" style={{ marginBottom: space["4"] }}>
              Tier Progression
            </Typography>
            <TierProgress
              tiers={tiers.data.tiers}
              currentTierIndex={tiers.data.currentTierIndex}
              data-testid="tier-progress"
            />
          </Card>
        </>
      )}
    </div>
  );
}
