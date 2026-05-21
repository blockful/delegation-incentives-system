import { parseSignature, publicActions } from "viem";
import type {
  Address,
  Chain,
  PublicActions,
  TransactionReceipt,
  WalletActions,
  WalletClient,
} from "viem";

import { relayDelegate } from "@anticapture/client";

import { RELAYER_CLIENT_BASE_URL, RELAYER_DAO_KEY } from "../relayerClient";

const ERC20VotesAbi = [
  {
    inputs: [{ internalType: "address", name: "delegatee", type: "address" }],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ERC20PermitReadAbi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const DELEGATION_TYPES = {
  Delegation: [
    { name: "delegatee", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

const DELEGATION_EXPIRY_SECONDS = 60 * 60;

export type DelegateClient = WalletClient & PublicActions & WalletActions;

export type DelegateMode = "gasless" | "fallback";

export interface DelegateToParams {
  tokenAddress: Address;
  delegateAddress: Address;
  account: Address;
  walletClient: WalletClient;
  onTxHash: (hash: `0x${string}`) => void;
  chain?: Chain;
  mode: DelegateMode;
}

const gaslessDelegate = async (
  client: DelegateClient,
  params: DelegateToParams,
): Promise<TransactionReceipt> => {
  const { tokenAddress, delegateAddress, account, onTxHash } = params;

  const [tokenName, nonce] = await Promise.all([
    client.readContract({
      abi: ERC20PermitReadAbi,
      address: tokenAddress,
      functionName: "name",
    }),
    client.readContract({
      abi: ERC20PermitReadAbi,
      address: tokenAddress,
      functionName: "nonces",
      args: [account],
    }),
  ]);

  const expiry = BigInt(
    Math.floor(Date.now() / 1000) + DELEGATION_EXPIRY_SECONDS,
  );

  const signature = await client.signTypedData({
    account,
    domain: {
      name: tokenName,
      version: "1",
      chainId: 1,
      verifyingContract: tokenAddress,
    },
    types: DELEGATION_TYPES,
    primaryType: "Delegation",
    message: {
      delegatee: delegateAddress,
      nonce,
      expiry,
    },
  });

  const { r, s, v } = parseSignature(signature);
  if (v === undefined) throw new Error("Signature missing v");

  const response = await relayDelegate(
    RELAYER_DAO_KEY,
    {
      delegatee: delegateAddress,
      nonce: nonce.toString(),
      expiry: expiry.toString(),
      r,
      s,
      v: Number(v),
    },
    RELAYER_CLIENT_BASE_URL ? { baseURL: RELAYER_CLIENT_BASE_URL } : undefined,
  );

  const hash = response.transactionHash as `0x${string}`;
  onTxHash(hash);
  return client.waitForTransactionReceipt({ hash });
};

export const delegateTo = async (
  params: DelegateToParams,
): Promise<TransactionReceipt> => {
  const client = params.walletClient.extend(publicActions) as DelegateClient;

  if (params.mode === "gasless") {
    return gaslessDelegate(client, params);
  }

  const { request } = await client.simulateContract({
    abi: ERC20VotesAbi,
    address: params.tokenAddress,
    functionName: "delegate",
    args: [params.delegateAddress],
    account: params.account,
    chain: params.chain,
  });

  const hash = await client.writeContract(request);
  params.onTxHash(hash);

  return client.waitForTransactionReceipt({ hash });
};
