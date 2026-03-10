import { useCallback, useState } from "react";
import { Typography, Card, Badge, Spinner } from "@/components/atoms";
import { AddressInput, StatCard } from "@/components/molecules";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/api";
import type { EligibilityResponse, ApyEstimateResponse } from "@/api";
import { space } from "@/theme";
import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["5"],
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: space["5"],
};

const resultCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space["4"],
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

export function EligibilityPage() {
  const [address, setAddress] = useState<string | null>(null);

  const eligibilityFn = useCallback(
    () => (address ? api.eligibility(address) : Promise.reject("No address")),
    [address],
  );
  const apyFn = useCallback(
    () => (address ? api.apy(address) : Promise.reject("No address")),
    [address],
  );

  const eligibility = useAsync<EligibilityResponse>(eligibilityFn, !!address);
  const apyData = useAsync<ApyEstimateResponse>(apyFn, !!address);

  const loading = eligibility.loading || apyData.loading;

  return (
    <div style={sectionStyle}>
      <div>
        <Typography variant="headingTwo" weight="extraBold">
          Check Eligibility
        </Typography>
        <Typography variant="body" color="secondary" style={{ marginTop: space["2"] }}>
          Enter an Ethereum address to check delegation reward eligibility and estimated APY.
        </Typography>
      </div>

      <Card>
        <AddressInput
          onSubmit={setAddress}
          loading={loading}
          placeholder="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        />
      </Card>

      {loading && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: space["3"], justifyContent: "center", padding: space["6"] }}>
            <Spinner />
            <Typography color="secondary">Fetching eligibility...</Typography>
          </div>
        </Card>
      )}

      {!loading && eligibility.data && (
        <Card data-testid="eligibility-result">
          <div style={resultCard}>
            <Typography variant="headingFour" weight="bold">
              Result
            </Typography>

            <div style={row}>
              <Typography variant="small" color="secondary">Eligible</Typography>
              <Badge variant={eligibility.data.eligible ? "green" : "red"}>
                {eligibility.data.eligible ? "Yes" : "No"}
              </Badge>
            </div>

            <div style={row}>
              <Typography variant="small" color="secondary">Active Delegate</Typography>
              <Badge variant={eligibility.data.isActiveDelegate ? "blue" : "grey"}>
                {eligibility.data.isActiveDelegate ? "Yes" : "No"}
              </Badge>
            </div>

            <div style={row}>
              <Typography variant="small" color="secondary">Delegator to Active</Typography>
              <Badge variant={eligibility.data.isDelegatorToActiveDelegate ? "blue" : "grey"}>
                {eligibility.data.isDelegatorToActiveDelegate ? "Yes" : "No"}
              </Badge>
            </div>

            {eligibility.data.delegatedTo && (
              <div style={row}>
                <Typography variant="small" color="secondary">Delegated To</Typography>
                <Typography variant="small" weight="bold" as="code">
                  {eligibility.data.delegatedTo.slice(0, 10)}...
                  {eligibility.data.delegatedTo.slice(-8)}
                </Typography>
              </div>
            )}
          </div>
        </Card>
      )}

      {!loading && apyData.data && apyData.data.role !== "ineligible" && (
        <div style={gridStyle}>
          <StatCard
            label="Estimated Monthly Reward"
            value={apyData.data.estimatedMonthlyRewardEns}
            suffix="ENS"
            data-testid="stat-reward"
          />
          <StatCard
            label="Estimated APY"
            value={`${apyData.data.estimatedApyPct}%`}
            data-testid="stat-apy"
          />
          <StatCard
            label="Current Balance"
            value={apyData.data.currentBalanceEns}
            suffix="ENS"
            data-testid="stat-balance"
          />
        </div>
      )}

      {!loading && (eligibility.error || apyData.error) && (
        <Card>
          <Typography color="red">
            Error: {eligibility.error || apyData.error}
          </Typography>
        </Card>
      )}
    </div>
  );
}
