import { useCallback, useState } from "react";
import { Typography, Card, Button, Badge, Spinner } from "@/components/atoms";
import { DataTable, StatCard, type Column } from "@/components/molecules";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/api";
import type { DistributionResponse, Payout, LotteryPool } from "@/api";
import { space, colors } from "@/theme";
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

const controlRow: CSSProperties = {
  display: "flex",
  gap: space["3"],
  alignItems: "flex-end",
};

const truncate = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

const payoutColumns: Column<Payout>[] = [
  {
    key: "address",
    header: "Address",
    render: (r) => (
      <code style={{ fontSize: "0.8rem", color: colors.blueDim }}>
        {truncate(r.address)}
      </code>
    ),
  },
  { key: "amount", header: "Amount (ENS)", render: (r) => r.amountEns, align: "right" },
  {
    key: "role",
    header: "Role",
    render: (r) => (
      <Badge variant={r.role === "delegate" ? "blue" : "green"}>
        {r.role}
      </Badge>
    ),
    align: "center",
  },
];

const lotteryColumns: Column<LotteryPool & { idx: number }>[] = [
  { key: "pool", header: "Pool", render: (r) => `#${r.idx + 1}`, align: "center" },
  { key: "prize", header: "Prize (ENS)", render: (r) => r.totalPrizeEns, align: "right" },
  {
    key: "winner",
    header: "Winner",
    render: (r) => (
      <code style={{ fontSize: "0.8rem", color: colors.blueDim }}>
        {truncate(r.winner)}
      </code>
    ),
  },
  { key: "entries", header: "Entries", render: (r) => String(r.entries.length), align: "center" },
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function DistributionsPage() {
  const [month, setMonth] = useState(currentMonth());

  const fetchFn = useCallback(() => api.distribution(month), [month]);
  const dist = useAsync<DistributionResponse>(fetchFn);

  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  const handleCompute = async () => {
    setComputing(true);
    setComputeError(null);
    try {
      await api.computeDistribution(month);
      dist.execute();
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : "Computation failed");
    } finally {
      setComputing(false);
    }
  };

  return (
    <div style={sectionStyle}>
      <div>
        <Typography variant="headingTwo" weight="extraBold">
          Distributions
        </Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: space["2"] }}>
          View and compute monthly reward distributions.
        </Typography>
      </div>

      <Card>
        <div style={controlRow}>
          <div>
            <label
              htmlFor="month-input"
              style={{ fontSize: "0.875rem", fontWeight: 700, color: colors.textSecondary, display: "block", marginBottom: space["2"] }}
            >
              Month
            </label>
            <input
              id="month-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                padding: `${space["3"]} ${space["4"]}`,
                borderRadius: "0.5rem",
                border: `1px solid ${colors.border}`,
                fontSize: "1rem",
                color: colors.textPrimary,
              }}
            />
          </div>
          <Button onClick={() => dist.execute()} disabled={dist.loading} variant="secondary">
            Fetch
          </Button>
          <Button onClick={handleCompute} disabled={computing}>
            {computing ? "Computing..." : "Compute"}
          </Button>
        </div>
      </Card>

      {computeError && (
        <Card>
          <Typography color="red">Compute error: {computeError}</Typography>
        </Card>
      )}

      {dist.loading && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: space["3"], justifyContent: "center", padding: space["8"] }}>
            <Spinner />
            <Typography color="secondary">Loading distribution...</Typography>
          </div>
        </Card>
      )}

      {dist.error && !dist.loading && (
        <Card>
          <Typography color="secondary">
            No distribution found for {month}. Click "Compute" to generate one.
          </Typography>
        </Card>
      )}

      {!dist.loading && dist.data && (
        <>
          <div style={gridStyle}>
            <StatCard
              label="Total Distributed"
              value={dist.data.metadata.totalDistributedEns}
              suffix="ENS"
            />
            <StatCard
              label="Active Delegates"
              value={dist.data.metadata.activeDelegateCount}
            />
            <StatCard
              label="Eligible Delegators"
              value={dist.data.metadata.eligibleDelegatorCount}
            />
            <StatCard
              label="Lottery Pools"
              value={dist.data.lotteryPools.length}
            />
          </div>

          <Card>
            <Typography variant="headingFour" weight="bold" style={{ marginBottom: space["4"] }}>
              Direct Payouts
            </Typography>
            <DataTable
              columns={payoutColumns}
              data={dist.data.directPayouts}
              keyExtractor={(r) => r.address}
              emptyMessage="No direct payouts"
              data-testid="payouts-table"
            />
          </Card>

          {dist.data.lotteryPools.length > 0 && (
            <Card>
              <Typography variant="headingFour" weight="bold" style={{ marginBottom: space["4"] }}>
                Lottery Pools
              </Typography>
              <DataTable
                columns={lotteryColumns}
                data={dist.data.lotteryPools.map((pool, idx) => ({ ...pool, idx }))}
                keyExtractor={(r) => `pool-${r.idx}`}
                emptyMessage="No lottery pools"
                data-testid="lottery-table"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
