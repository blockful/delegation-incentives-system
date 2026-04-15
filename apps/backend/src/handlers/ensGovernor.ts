// Re-export for tests (canonical file is ens-governor.ts)
export {
  handleProposalCreated,
  handleVoteCast,
  handleProposalExecuted,
  handleProposalDefeated,
  handleProposalCanceled,
  registerEnsGovernorHandlers,
} from "./ens-governor.js";
