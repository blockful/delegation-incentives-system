import { useCallback } from "react";
import { Typography, Card, Badge, Spinner } from "@/components/atoms";
import { StatCard, DataTable, type Column } from "@/components/molecules";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/api";
import type { StatusResponse, ActiveDelegatesResponse } from "@/api";
import { space, colors } from "@/theme";
import type { CSSProperties } from "react";

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: space["5"],
  marginBottom: space["8"],
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["5"],
};

const headerStyle: CSSProperties = {
  marginBottom: space["6"],
};

const truncate = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

const delegateColumnsWithIndex: Column<{ addr: string; idx: number }>[] = [
  {
    key: "index",
    header: "#",
    render: (row) => String(row.idx + 1),
    align: "center",
  },
  {
    key: "address",
    header: "Delegate Address",
    render: (row) => (
      <code style={{ fontSize: "0.8rem", color: colors.blueDim }}>
        {truncate(row.addr)}
      </code>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: () => <Badge variant="green">Active</Badge>,
    align: "center",
  },
];

export function DashboardPage() {
  const statusFn = useCallback(() => api.status(), []);
  const delegatesFn = useCallback(() => api.activeDelegates(), []);

  const status = useAsync<StatusResponse>(statusFn);
  const delegates = useAsync<ActiveDelegatesResponse>(delegatesFn);

  const loading = status.loading || delegates.loading;
  const error = status.error || delegates.error;

  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>
        <Typography variant="headingTwo" weight="extraBold">
          Dashboard
        </Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: space["2"] }}>
          ENS Delegation Incentives Program overview
        </Typography>
      </div>

      {loading && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: space["3"], justifyContent: "center", padding: space["8"] }}>
            <Spinner />
            <Typography color="secondary">Loading dashboard data...</Typography>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <Typography color="red">Error: {error}</Typography>
        </Card>
      )}

      {!loading && !error && status.data && delegates.data && (
        <>
          <div style={gridStyle}>
            <StatCard
              label="Active Delegates"
              value={status.data.activeDelegateCount}
              data-testid="stat-delegates"
            />
            <StatCard
              label="Proposals Tracked"
              value={status.data.proposalCount}
              data-testid="stat-proposals"
            />
            <StatCard
              label="Cached Distributions"
              value={status.data.cachedDistributions.length}
              data-testid="stat-distributions"
            />
          </div>

          <Card>
            <Typography variant="headingFour" weight="bold" style={{ marginBottom: space["4"] }}>
              Active Delegates
            </Typography>
            <DataTable
              columns={delegateColumnsWithIndex}
              data={delegates.data.delegates.map((addr, idx) => ({ addr, idx }))}
              keyExtractor={(row) => row.addr}
              emptyMessage="No active delegates found"
              data-testid="delegates-table"
            />
          </Card>
        </>
      )}
    </div>
  );
}
