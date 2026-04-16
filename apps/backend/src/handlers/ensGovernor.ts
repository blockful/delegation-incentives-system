// Re-export for tests (canonical file is ens-governor.ts)
export {
  handleProposalCreated,
  handleVoteCast,
  handleProposalExecuted,
  handleProposalCanceled,
  handleProposalQueued,
  registerEnsGovernorHandlers,
} from "./ens-governor.js";
