import { describe, it, expect, beforeAll } from "vitest";
import { createApi } from "@/api/routes.js";
import { InMemoryDataSource } from "@/data/in-memory-datasource.js";
import {
  type Proposal,
  type Vote,
  type VotingPowerSnapshot,
  type BalanceEvent,
  type Delegation,
  type AccountBalance,
  wei,
  seconds,
  ONE_ENS,
} from "@/domain/types.js";
import { monthStartTimestamp, monthEndTimestamp } from "@/util/time.js";

const MONTH_START = monthStartTimestamp(2025, 3);
const MONTH_END = monthEndTimestamp(2025, 3);
const PREV_MONTH_END = monthEndTimestamp(2025, 2);
const TWB_WINDOW_START = seconds(
  (MONTH_END as bigint) - 180n * 86400n,
);

function makeProposals(): Proposal[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `prop-${i}`,
    status: "executed",
    timestamp: seconds(BigInt(1704067200 + i * 604800)),
    endTimestamp: seconds(BigInt(1704067200 + i * 604800 + 604800)),
    daoId: "ens",
  }));
}

function makeDataSource(): InMemoryDataSource {
  const proposals = makeProposals();
  const votes: Vote[] = proposals
    .slice(0, 8)
    .map((p) => ({
      voterAccountId: "delegate-A",
      proposalId: p.id,
      support: 1,
      votingPower: wei(1000n * ONE_ENS),
      timestamp: seconds(0n),
    }));

  const vpSnapshots: VotingPowerSnapshot[] = [
    {
      accountId: "delegate-A",
      votingPower: wei(5000n * ONE_ENS),
      delta: wei(0n),
      timestamp: seconds((PREV_MONTH_END as bigint) - 86400n),
    },
    {
      accountId: "delegate-A",
      votingPower: wei(6000n * ONE_ENS),
      delta: wei(0n),
      timestamp: seconds((MONTH_START as bigint) + 1n),
    },
  ];

  const delegations: Delegation[] = [
    {
      delegatorId: "delegator-1",
      delegateId: "delegate-A",
      delegatedValue: wei(100n * ONE_ENS),
      timestamp: seconds((MONTH_START as bigint) - 86400n),
    },
  ];

  const balanceEvents: BalanceEvent[] = [
    {
      accountId: "delegator-1",
      balance: wei(100n * ONE_ENS),
      delta: wei(100n * ONE_ENS),
      timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
    },
  ];

  const accountBalances: AccountBalance[] = [
    {
      accountId: "delegator-1",
      balance: wei(100n * ONE_ENS),
      delegate: "delegate-A",
    },
  ];

  return new InMemoryDataSource({
    proposals,
    votes,
    votingPowerSnapshots: vpSnapshots,
    balanceEvents,
    delegations,
    accountBalances,
    randaoValues: new Map([["2025-03-31", 42n]]),
  });
}

describe("REST API", () => {
  let app: ReturnType<typeof createApi>;

  beforeAll(() => {
    const dataSource = makeDataSource();
    app = createApi({ dataSource });
  });

  it("GET /health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /delegates/active returns active delegates", async () => {
    const res = await app.request("/delegates/active");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.delegates).toContain("delegate-A");
  });

  it("GET /eligibility/:address checks delegate eligibility", async () => {
    const res = await app.request("/eligibility/delegate-A");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActiveDelegate).toBe(true);
    expect(body.eligible).toBe(true);
  });

  it("GET /eligibility/:address checks delegator eligibility", async () => {
    const res = await app.request("/eligibility/delegator-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isDelegatorToActiveDelegate).toBe(true);
    expect(body.eligible).toBe(true);
  });

  it("GET /eligibility/:address returns ineligible for unknown address", async () => {
    const res = await app.request("/eligibility/0xunknown");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.eligible).toBe(false);
  });

  it("GET /status returns system status", async () => {
    const res = await app.request("/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activeDelegateCount).toBe(1);
    expect(body.proposalCount).toBe(10);
  });

  it("GET /distributions/:month returns 404 before computation", async () => {
    const res = await app.request("/distributions/2025-03");
    expect(res.status).toBe(404);
  });

  it("POST /distributions/:month/compute triggers computation", async () => {
    const res = await app.request("/distributions/2025-03/compute", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.month).toBe("2025-03");
    expect(body.activeDelegateCount).toBe(1);
    expect(body.directPayoutCount).toBeGreaterThan(0);
  });

  it("GET /distributions/:month returns JSON after computation", async () => {
    const res = await app.request("/distributions/2025-03");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.month).toBe("2025-03");
    expect(body.directPayouts.length).toBeGreaterThan(0);
  });

  it("GET /distributions/:month/csv returns CSV after computation", async () => {
    const res = await app.request("/distributions/2025-03/csv");
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("address");
    expect(csv).toContain("amount_wei");
  });

  it("POST /distributions/:month/compute rejects invalid month format", async () => {
    const res = await app.request("/distributions/invalid/compute", {
      method: "POST",
    });
    expect(res.status).toBe(400);
  });
});
