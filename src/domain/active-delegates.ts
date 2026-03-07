import {
  type Proposal,
  type Vote,
  ACTIVE_VOTE_THRESHOLD,
  PROPOSAL_WINDOW_SIZE,
} from "./types.js";

/**
 * Identify active delegates from the last N on-chain proposals.
 * A delegate is active if they voted on at least ACTIVE_VOTE_THRESHOLD
 * of the last PROPOSAL_WINDOW_SIZE proposals.
 */
export function identifyActiveDelegates(
  proposals: Proposal[],
  votes: Vote[],
): Set<string> {
  if (proposals.length === 0) return new Set();

  // Take the last PROPOSAL_WINDOW_SIZE proposals by timestamp
  const sorted = [...proposals].sort(
    (a, b) => Number(b.timestamp - a.timestamp), // descending
  );
  const recentProposals = sorted.slice(0, PROPOSAL_WINDOW_SIZE);
  const recentProposalIds = new Set(recentProposals.map((p) => p.id));

  // Count unique proposals each delegate voted on
  const voteCountByDelegate = new Map<string, Set<string>>();

  for (const vote of votes) {
    if (!recentProposalIds.has(vote.proposalId)) continue;

    let proposalSet = voteCountByDelegate.get(vote.voterAccountId);
    if (!proposalSet) {
      proposalSet = new Set();
      voteCountByDelegate.set(vote.voterAccountId, proposalSet);
    }
    proposalSet.add(vote.proposalId);
  }

  // Filter to those meeting the threshold
  const activeDelegates = new Set<string>();
  for (const [delegate, proposalSet] of voteCountByDelegate) {
    if (proposalSet.size >= ACTIVE_VOTE_THRESHOLD) {
      activeDelegates.add(delegate);
    }
  }

  return activeDelegates;
}
