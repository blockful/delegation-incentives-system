import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { governanceProposal, distributionResult, ensDelegation, ensBalance } from "ponder:schema";
import { sql, desc, inArray, and, eq } from "drizzle-orm";
import { fetchActiveVoters, getActiveVpTotal, formatEns } from "../helpers.js";

const StatsResponse = z.object({
  activeVoterCount: z.number().openapi({ example: 25 }),
  proposalCount: z.number().openapi({ example: 142 }),
  cachedDistributions: z.array(z.string()).openapi({ example: ["2026-03", "2026-02"] }),
  totalDelegatedEns: z
    .string()
    .openapi({
      description: "Total ENS held by active voters (sum of latest VP snapshots), formatted as ENS string",
      example: "1250000.000000000000000000",
    }),
  holdersEarning: z
    .number()
    .openapi({
      description: "Current count of active voters plus unique direct token holders of active voters with a positive ENS balance. This is live delegation state, not finalized round payout recipients.",
      example: 412,
    }),
});

const route = createRoute({
  method: "get",
  path: "/stats",
  tags: ["System"],
  summary: "System statistics",
  description:
    "Returns active voter count, total indexed proposals, and available distribution months.",
  responses: {
    200: {
      description: "System stats",
      content: { "application/json": { schema: StatsResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const app = new OpenAPIHono();

app.openapi(route, async (c) => {
  try {
    const { activeVoters } = await fetchActiveVoters(db);

    const proposalCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(governanceProposal);
    const proposalCount = Number(proposalCountRows[0]?.count ?? 0);

    const distRows = await db
      .select({ month: distributionResult.month })
      .from(distributionResult)
      .orderBy(desc(distributionResult.month));
    const cachedDistributions = distRows.map((r) => r.month);

    const totalDelegatedWei = await getActiveVpTotal(db, activeVoters);
    const totalDelegatedEns = formatEns(totalDelegatedWei);

    let holdersEarning = activeVoters.size;
    if (activeVoters.size > 0) {
      const activeList = [...activeVoters].map((a) => a.toLowerCase());
      const tokenHolderRows = await db
        .select({ tokenHolder: ensDelegation.id })
        .from(ensDelegation)
        .innerJoin(ensBalance, eq(ensBalance.id, ensDelegation.id))
        .where(
          and(
            inArray(ensDelegation.voterId, activeList),
            sql`${ensBalance.balance} > 0`,
          ),
        );

      const uniqueTokenHolders = new Set<string>();
      for (const row of tokenHolderRows) {
        const tokenHolder = row.tokenHolder.toLowerCase();
        if (!activeVoters.has(tokenHolder as `0x${string}`)) {
          uniqueTokenHolders.add(tokenHolder);
        }
      }
      holdersEarning += uniqueTokenHolders.size;
    }

    return c.json(
      {
        activeVoterCount: activeVoters.size,
        proposalCount,
        cachedDistributions,
        totalDelegatedEns,
        holdersEarning,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
