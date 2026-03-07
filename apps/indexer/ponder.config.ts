import { createConfig } from "ponder";
import { http } from "viem";

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
      { name: "rate", type: "uint256", indexed: false },
      { name: "period", type: "uint256", indexed: false },
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

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1,
    },
  },
  contracts: {
    ERC20MultiDelegate: {
      chain: "mainnet",
      abi: erc20MultiDelegateAbi,
      address: "0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446",
      startBlock: 18564837,
    },
    HedgeyVesting: {
      chain: "mainnet",
      abi: hedgeyVestingAbi,
      address: "0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C",
      startBlock: 18506969,
    },
  },
});
