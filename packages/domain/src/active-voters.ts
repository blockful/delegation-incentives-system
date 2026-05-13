import type { Address, Proposal, Vote } from "./types.js";
import { ACTIVE_VOTE_THRESHOLD, PROPOSAL_WINDOW_SIZE } from "./config.js";

/**
 * From a list of finalized proposals, take the last N (sorted by finalizedTimestamp desc).
 * Returns up to PROPOSAL_WINDOW_SIZE proposals.
 */
export function getLastFinalizedProposals(
  proposals: readonly Proposal[],
  limit: number = PROPOSAL_WINDOW_SIZE,
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
 * identify voters who voted on >= ACTIVE_VOTE_THRESHOLD of them.
 * Returns a Set of active-voter addresses.
 */
export function identifyActiveVoters(
  proposals: readonly Proposal[],
  votes: readonly Vote[],
  threshold: number = ACTIVE_VOTE_THRESHOLD,
): Set<Address> {
  const proposalIds = new Set(proposals.map((p) => p.id));

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
