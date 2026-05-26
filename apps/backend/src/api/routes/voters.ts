import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import {
  ensVotingPowerSnapshot,
  ensDelegation,
  governanceVote,
  governanceProposal,
  ensBalance,
} from "ponder:schema";
import { eq, asc, desc, sql, and, inArray } from "drizzle-orm";
import type { Address } from "@ens-dis/domain";
import { fetchActiveVoters } from "../helpers.js";
import { parseProposalTitle } from "../proposal-title.js";

const ProposalVoteSchema = z.object({
  proposalId: z.string().openapi({ example: "39893466662181856279242827854933926689925858494049650894234231038376231891860" }),
  title: z.string().openapi({ example: "EP 6.6 — [Executable] Working Group budgets, Term 6" }),
  status: z.string().openapi({
    description: "Proposal status (executed, succeeded, queued, defeated, expired)",
    example: "executed",
  }),
  voterSupport: z
    .number()
    .nullable()
    .openapi({
      description: "Voter's vote: 0=Against, 1=For, 2=Abstain, null=did not vote",
      example: 1,
    }),
});

const VoterSchema = z.object({
  address: z.string().openapi({ example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
  ensName: z.string().nullable().openapi({ example: null }),
  avatarUrl: z.string().nullable().openapi({ example: null }),
  votingPower: z.string().openapi({ example: "1000000000000000000000" }),
  votesInLast10: z.number().openapi({ example: 8 }),
  last10ProposalsVoted: z
    .array(z.boolean())
    .openapi({
      description: "Per-proposal voting record for the last 10 finalized proposals (most recent first)",
      example: [true, true, true, false, true, true, true, true, false, true],
    }),
  last10Proposals: z.array(ProposalVoteSchema).openapi({
    description: "Detailed per-proposal record (same order as last10ProposalsVoted)",
  }),
  tokenHolderCount: z.number().openapi({ example: 42 }),
  activeSince: z
    .string()
    .nullable()
    .openapi({ description: "ISO 8601 timestamp of the voter's earliest vote", example: "2024-01-15T00:00:00.000Z" }),
});

const route = createRoute({
  method: "get",
  path: "/voters/active",
  tags: ["Voters"],
  summary: "List active voters",
  description:
    "Returns voters who meet the voting activity threshold, sorted by voting power descending.",
  responses: {
    200: {
      description: "Active voters list",
      content: {
        "application/json": {
          schema: z.object({ count: z.number(), voters: z.array(VoterSchema) }),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

const app = new OpenAPIHono();

app.openapi(route, async (c) => {
  try {
    const { activeVoters, proposalIds, voteCounts, voterProposals } =
      await fetchActiveVoters(db);

    // Fetch description + status for each window proposal so we can render
    // titles and outcomes on the frontend.
    const proposalMetaRows = proposalIds.length > 0
      ? await db
          .select({
            id: governanceProposal.id,
            description: governanceProposal.description,
            status: governanceProposal.status,
          })
          .from(governanceProposal)
          .where(inArray(governanceProposal.id, proposalIds))
      : [];

    const proposalMetaById = new Map(
      proposalMetaRows.map((row) => [row.id, {
        title: parseProposalTitle(row.description),
        status: row.status as string,
      }]),
    );

    // Fetch per-voter support values for all (voter, proposal) pairs in the window.
    const activeVoterList = [...activeVoters];
    const voteSupportRows = proposalIds.length > 0 && activeVoterList.length > 0
      ? await db
          .select({
            voter: governanceVote.voter,
            proposalId: governanceVote.proposalId,
            support: governanceVote.support,
          })
          .from(governanceVote)
          .where(
            and(
              inArray(governanceVote.proposalId, proposalIds),
              inArray(governanceVote.voter, activeVoterList.map((a) => a.toLowerCase())),
            ),
          )
      : [];

    // Index by `${voter}-${proposalId}` for O(1) lookup.
    const supportByVoterProposal = new Map<string, number>();
    for (const row of voteSupportRows) {
      supportByVoterProposal.set(`${row.voter}-${row.proposalId}`, row.support);
    }

    const voters: z.infer<typeof VoterSchema>[] = [];

    for (const addr of activeVoters) {
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.voterId, addr.toLowerCase()))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      const votingPower =
        vpRows.length > 0 ? BigInt(vpRows[0].votingPower).toString() : "0";

      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(ensDelegation)
        .innerJoin(ensBalance, eq(ensBalance.id, ensDelegation.id))
        .where(
          and(
            eq(ensDelegation.voterId, addr.toLowerCase()),
            sql`${ensBalance.balance} > 0`,
          ),
        );

      const voted = voterProposals.get(addr as Address) ?? new Set<string>();
      const last10ProposalsVoted = proposalIds.map((pid) => voted.has(pid));
      const last10Proposals = proposalIds.map((pid) => {
        const meta = proposalMetaById.get(pid);
        const support = supportByVoterProposal.get(`${addr.toLowerCase()}-${pid}`);
        return {
          proposalId: pid,
          title: meta?.title ?? "",
          status: meta?.status ?? "",
          voterSupport: support ?? null,
        };
      });

      // Earliest vote timestamp
      const earliestVoteRows = await db
        .select({ timestamp: governanceVote.timestamp })
        .from(governanceVote)
        .where(eq(governanceVote.voter, addr.toLowerCase()))
        .orderBy(asc(governanceVote.timestamp))
        .limit(1);

      const activeSince =
        earliestVoteRows.length > 0
          ? new Date(Number(earliestVoteRows[0].timestamp) * 1000).toISOString()
          : null;

      voters.push({
        address: addr,
        ensName: null,    // ENS resolution handled client-side
        avatarUrl: null,  // ENS resolution handled client-side
        votingPower,
        votesInLast10: voteCounts.get(addr) ?? 0,
        last10ProposalsVoted,
        last10Proposals,
        tokenHolderCount: Number(countRows[0]?.count ?? 0),
        activeSince,
      });
    }

    voters.sort((a, b) => {
      const vpA = BigInt(a.votingPower);
      const vpB = BigInt(b.votingPower);
      if (vpB > vpA) return 1;
      if (vpB < vpA) return -1;
      return 0;
    });

    return c.json({ count: voters.length, voters }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
