import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createConfig } from "ponder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const erc20MultiDelegateAbi = [
  {
    type: "event",
    name: "ProxyDeployed",
    inputs: [
      { name: "delegate", type: "address", indexed: true },
      { name: "proxyAddress", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DelegationProcessed",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TransferSingle",
    inputs: [
      { name: "operator", type: "address", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "id", type: "uint256", indexed: false },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TransferBatch",
    inputs: [
      { name: "operator", type: "address", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "ids", type: "uint256[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
    ],
  },
] as const;

const hedgeyVestingAbi = [
  {
    type: "event",
    name: "PlanCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "start", type: "uint256", indexed: false },
      { name: "cliff", type: "uint256", indexed: false },
      { name: "end", type: "uint256", indexed: false },
      { name: "rate", type: "uint256", indexed: false },
      { name: "period", type: "uint256", indexed: false },
      { name: "vestingAdmin", type: "address", indexed: false },
      { name: "adminTransferOBO", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PlanRedeemed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "amountRedeemed", type: "uint256", indexed: false },
      { name: "planRemainder", type: "uint256", indexed: false },
      { name: "resetDate", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

const ensTokenAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DelegateChanged",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "fromDelegate", type: "address", indexed: true },
      { name: "toDelegate", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "DelegateVotesChanged",
    inputs: [
      { name: "delegate", type: "address", indexed: true },
      { name: "previousBalance", type: "uint256", indexed: false },
      { name: "newBalance", type: "uint256", indexed: false },
    ],
  },
] as const;

const ensGovernorAbi = [
  {
    name: "ProposalCreated",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "proposer", type: "address", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "signatures", type: "string[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
  {
    name: "VoteCast",
    type: "event",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    name: "VoteCastWithParams",
    type: "event",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
      { name: "params", type: "bytes", indexed: false },
    ],
  },
  {
    name: "ProposalExecuted",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
  {
    name: "ProposalDefeated",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
  {
    name: "ProposalCanceled",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
] as const;

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.RPC_URL,
    },
  },
  contracts: {
    ERC20MultiDelegate: {
      chain: "mainnet",
      abi: erc20MultiDelegateAbi,
      address: "0x3CA5CCC96648d016D41c5aF40eED82202BD019cc",
      startBlock: 22140079,
    },
    HedgeyVesting: {
      chain: "mainnet",
      abi: hedgeyVestingAbi,
      address: "0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C",
      startBlock: 18506969,
    },
    ENSToken: {
      chain: "mainnet",
      abi: ensTokenAbi,
      address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
      // Start block covers ~12 months before the program launch (Feb 2026).
      // Provides ample margin beyond the 180-day TWB window.
      // Adjust if the program timeline shifts.
      startBlock: 21000000,
    },
    ENSGovernor: {
      chain: "mainnet",
      abi: ensGovernorAbi,
      address: "0x323a76393544d5ecca80cd6ef2a560c6a395b7e3",
      startBlock: 13533800,
    },
  },
});
