import type { Address, Proposal, Vote } from "./types.js";
import { ACTIVE_THRESHOLD, PROPOSAL_WINDOW } from "./config.js";

/**
 * From a list of finalized proposals, take the last N (sorted by finalizedTimestamp desc).
 * Returns up to PROPOSAL_WINDOW proposals.
 */
export function getLastFinalizedProposals(
  proposals: readonly Proposal[],
  limit: number = PROPOSAL_WINDOW,
): Proposal[] {
  return [...proposals]
    .sort((a, b) => {
      if (a.finalizedTimestamp > b.finalizedTimestamp) return -1;
      if (a.finalizedTimestamp < b.finalizedTimestamp) return 1;
      return 0;
    })
    .slice(0, limit);
}

/**
 * Given the last N finalized proposals and all votes cast on them,
 * identify delegates who voted on >= ACTIVE_THRESHOLD of them.
 * Returns a Set of active delegate addresses.
 */
export function identifyActiveDelegates(
  proposals: readonly Proposal[],
  votes: readonly Vote[],
  threshold: number = ACTIVE_THRESHOLD,
): Set<Address> {
  const proposalIds = new Set(proposals.map((p) => p.id));

  // Count how many distinct proposals each voter voted on.
  const voteCounts = new Map<Address, Set<string>>();

  for (const vote of votes) {
    if (!proposalIds.has(vote.proposalId)) continue;

    let seen = voteCounts.get(vote.voter);
    if (!seen) {
      seen = new Set<string>();
      voteCounts.set(vote.voter, seen);
    }
    seen.add(vote.proposalId);
  }

  const active = new Set<Address>();
  for (const [voter, proposalsVotedOn] of voteCounts) {
    if (proposalsVotedOn.size >= threshold) {
      active.add(voter);
    }
  }

  return active;
}
