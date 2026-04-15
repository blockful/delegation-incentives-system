import { Hono } from "hono";
import { db } from "ponder:api";
import { ensVotingPowerSnapshot, ensDelegation } from "ponder:schema";
import { eq, desc, sql } from "drizzle-orm";
import { fetchActiveDelegates } from "../helpers.js";

const app = new Hono();

app.get("/api/delegates/active", async (c) => {
  try {
    const { activeDelegates, voteCounts } = await fetchActiveDelegates(db);

    const delegates: {
      address: string;
      votingPower: string;
      votesInLast10: number;
      isActive: boolean;
      delegatorCount: number;
    }[] = [];

    for (const addr of activeDelegates) {
      // Get current VP (most recent snapshot)
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.accountId, addr.toLowerCase()))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      const votingPower = vpRows.length > 0 ? BigInt(vpRows[0].votingPower).toString() : "0";

      // Count delegators pointing to this delegate
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(ensDelegation)
        .where(eq(ensDelegation.delegateId, addr.toLowerCase()));

      const delegatorCount = countRows[0]?.count ?? 0;

      delegates.push({
        address: addr,
        votingPower,
        votesInLast10: voteCounts.get(addr) ?? 0,
        isActive: true,
        delegatorCount: Number(delegatorCount),
      });
    }

    // Sort by VP descending
    delegates.sort((a, b) => {
      const vpA = BigInt(a.votingPower);
      const vpB = BigInt(b.votingPower);
      if (vpB > vpA) return 1;
      if (vpB < vpA) return -1;
      return 0;
    });

    return c.json({ delegates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
