import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { parseSignature } from "viem";
import type { Address, Chain, TransactionReceipt } from "viem";

import { server } from "@/test/mocks/server";

import { delegateTo, type DelegateClient } from "./delegateTo";
import { isRelayerError } from "./gaslessRelayerError";

const TOKEN_ADDRESS =
  "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72" as Address;
const DELEGATEE_ADDRESS =
  "0x2222222222222222222222222222222222222222" as Address;
const ACCOUNT_ADDRESS =
  "0x1111111111111111111111111111111111111111" as Address;
const WRITE_TX_HASH =
  "0xfeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface" as `0x${string}`;
const RELAY_TX_HASH =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as `0x${string}`;

// 65-byte sig: r (32) + s (32) + v=0x1c (28) → parseSignature yields v = 28n
const SIG_WITH_V =
  "0x1111111111111111111111111111111111111111111111111111111111111111" +
  "2222222222222222222222222222222222222222222222222222222222222222" +
  "1c";

// 65-byte sig with last byte 0x01 → parseSignature yields v === undefined
const SIG_WITHOUT_V =
  "0x1111111111111111111111111111111111111111111111111111111111111111" +
  "2222222222222222222222222222222222222222222222222222222222222222" +
  "01";

const EXPECTED_R =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const EXPECTED_S =
  "0x2222222222222222222222222222222222222222222222222222222222222222";

// Parse SIG_WITH_V once at module level so expected values stay in sync with viem's parser.
const PARSED_SIG_WITH_V = parseSignature(SIG_WITH_V as `0x${string}`);
const EXPECTED_V_NUMBER = Number(PARSED_SIG_WITH_V.v);

const FROZEN_NOW = new Date("2026-05-19T12:00:00Z");
const FROZEN_NOW_SECONDS = Math.floor(FROZEN_NOW.getTime() / 1000);
const EXPECTED_EXPIRY = BigInt(FROZEN_NOW_SECONDS + 3600);

const RECEIPT_STUB: TransactionReceipt = {
  blobGasPrice: undefined,
  blobGasUsed: undefined,
  blockHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  blockNumber: 1n,
  contractAddress: null,
  cumulativeGasUsed: 21000n,
  effectiveGasPrice: 1n,
  from: ACCOUNT_ADDRESS,
  gasUsed: 21000n,
  logs: [],
  logsBloom: "0x",
  root: undefined,
  status: "success",
  to: null,
  transactionHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  transactionIndex: 0,
  type: "eip1559",
};

const notImplemented = (): never => {
  throw new Error("not implemented in test fake");
};

interface SimpleWalletClient {
  readContract: ReturnType<typeof vi.fn>;
  signTypedData: ReturnType<typeof vi.fn>;
  simulateContract: ReturnType<typeof vi.fn>;
  writeContract: ReturnType<typeof vi.fn>;
  waitForTransactionReceipt: ReturnType<typeof vi.fn>;
}

const buildFake = (): { client: SimpleWalletClient; asDelegate: DelegateClient } => {
  const readContract = vi.fn();
  const signTypedData = vi.fn();
  const simulateContract = vi.fn();
  const writeContract = vi.fn();
  const waitForTransactionReceipt = vi.fn();

  const base = {
    readContract,
    signTypedData,
    simulateContract,
    writeContract,
    waitForTransactionReceipt,
    extend() {
      return base;
    },
    // Surface guards: any other method delegateTo might touch should throw clearly.
    getChainId: notImplemented,
    getAddresses: notImplemented,
    sendTransaction: notImplemented,
    signMessage: notImplemented,
    switchChain: notImplemented,
    signTransaction: notImplemented,
    estimateGas: notImplemented,
    multicall: notImplemented,
    getBalance: notImplemented,
    getBlock: notImplemented,
    getTransaction: notImplemented,
    getTransactionReceipt: notImplemented,
    getCode: notImplemented,
    sendRawTransaction: notImplemented,
    deployContract: notImplemented,
    requestAddresses: notImplemented,
    requestPermissions: notImplemented,
    getPermissions: notImplemented,
    watchAsset: notImplemented,
    addChain: notImplemented,
    prepareTransactionRequest: notImplemented,
  };

  const client: SimpleWalletClient = {
    readContract,
    signTypedData,
    simulateContract,
    writeContract,
    waitForTransactionReceipt,
  };

  const asDelegate = base as unknown as DelegateClient;

  return { client, asDelegate };
};

const MAINNET_CHAIN: Chain = {
  id: 1,
  name: "Ethereum",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: ["http://localhost"] } },
};

describe("delegateTo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gasless happy path: signs typed data, posts to relayer, returns receipt", async () => {
    const { client, asDelegate } = buildFake();

    client.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "name") return Promise.resolve("ENS");
      if (functionName === "nonces") return Promise.resolve(42n);
      throw new Error(`unexpected readContract ${functionName}`);
    });
    client.signTypedData.mockResolvedValue(SIG_WITH_V);
    client.waitForTransactionReceipt.mockResolvedValue(RECEIPT_STUB);

    let observedBody: unknown = null;
    server.use(
      http.post("/api/gateful/ens/relay/delegate", async ({ request }) => {
        observedBody = await request.json();
        return HttpResponse.json({ transactionHash: RELAY_TX_HASH });
      }),
    );

    const onTxHash = vi.fn();

    const receipt = await delegateTo({
      tokenAddress: TOKEN_ADDRESS,
      delegateAddress: DELEGATEE_ADDRESS,
      account: ACCOUNT_ADDRESS,
      walletClient: asDelegate,
      onTxHash,
      mode: "gasless",
    });

    expect(receipt).toBe(RECEIPT_STUB);

    expect(client.signTypedData.mock.calls[0][0]).toEqual({
      account: ACCOUNT_ADDRESS,
      domain: {
        name: "ENS",
        version: "1",
        chainId: 1,
        verifyingContract: TOKEN_ADDRESS,
      },
      types: {
        Delegation: [
          { name: "delegatee", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
        ],
      },
      primaryType: "Delegation",
      message: {
        delegatee: DELEGATEE_ADDRESS,
        nonce: 42n,
        expiry: EXPECTED_EXPIRY,
      },
    });

    expect(observedBody).toEqual({
      delegatee: DELEGATEE_ADDRESS,
      nonce: "42",
      expiry: EXPECTED_EXPIRY.toString(),
      r: EXPECTED_R,
      s: EXPECTED_S,
      v: EXPECTED_V_NUMBER,
    });

    expect(onTxHash).toHaveBeenCalledTimes(1);
    expect(onTxHash).toHaveBeenCalledWith(RELAY_TX_HASH);

    expect(client.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: RELAY_TX_HASH,
    });
    expect(client.simulateContract).not.toHaveBeenCalled();
    expect(client.writeContract).not.toHaveBeenCalled();
  });

  it("gasless: throws when signature has no v and does not call relayer", async () => {
    const { client, asDelegate } = buildFake();

    client.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "name") return Promise.resolve("ENS");
      if (functionName === "nonces") return Promise.resolve(7n);
      throw new Error(`unexpected readContract ${functionName}`);
    });
    client.signTypedData.mockResolvedValue(SIG_WITHOUT_V);

    let relayCalled = false;
    server.use(
      http.post("/api/gateful/ens/relay/delegate", () => {
        relayCalled = true;
        return HttpResponse.json({ transactionHash: RELAY_TX_HASH });
      }),
    );

    const onTxHash = vi.fn();

    await expect(
      delegateTo({
        tokenAddress: TOKEN_ADDRESS,
        delegateAddress: DELEGATEE_ADDRESS,
        account: ACCOUNT_ADDRESS,
        walletClient: asDelegate,
        onTxHash,
        mode: "gasless",
      }),
    ).rejects.toThrow(/Signature missing v/);

    expect(relayCalled).toBe(false);
    expect(onTxHash).not.toHaveBeenCalled();
    expect(client.waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it("fallback happy path: simulates, writes, returns receipt without signing", async () => {
    const { client, asDelegate } = buildFake();

    const simulatedRequest = {
      abi: [],
      address: TOKEN_ADDRESS,
      functionName: "delegate",
      args: [DELEGATEE_ADDRESS],
    };
    client.simulateContract.mockResolvedValue({ request: simulatedRequest });
    client.writeContract.mockResolvedValue(WRITE_TX_HASH);
    client.waitForTransactionReceipt.mockResolvedValue(RECEIPT_STUB);
    client.signTypedData.mockImplementation(() => {
      throw new Error("signTypedData must not be called in fallback");
    });

    let relayCalled = false;
    server.use(
      http.post("/api/gateful/ens/relay/delegate", () => {
        relayCalled = true;
        return HttpResponse.json({ transactionHash: RELAY_TX_HASH });
      }),
    );

    const onTxHash = vi.fn();

    const receipt = await delegateTo({
      tokenAddress: TOKEN_ADDRESS,
      delegateAddress: DELEGATEE_ADDRESS,
      account: ACCOUNT_ADDRESS,
      walletClient: asDelegate,
      onTxHash,
      chain: MAINNET_CHAIN,
      mode: "fallback",
    });

    expect(receipt).toBe(RECEIPT_STUB);

    const simulateArg = client.simulateContract.mock.calls[0][0];
    expect(simulateArg.functionName).toBe("delegate");
    expect(simulateArg.args).toEqual([DELEGATEE_ADDRESS]);
    expect(simulateArg.address).toBe(TOKEN_ADDRESS);
    expect(simulateArg.account).toBe(ACCOUNT_ADDRESS);
    expect(simulateArg.chain).toBe(MAINNET_CHAIN);
    expect(Array.isArray(simulateArg.abi)).toBe(true);

    expect(client.writeContract).toHaveBeenCalledWith(simulatedRequest);
    expect(client.signTypedData).not.toHaveBeenCalled();
    expect(client.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: WRITE_TX_HASH,
    });

    expect(onTxHash).toHaveBeenCalledTimes(1);
    expect(onTxHash).toHaveBeenCalledWith(WRITE_TX_HASH);

    expect(relayCalled).toBe(false);
  });

  it("fallback: simulateContract rejects → writeContract is not called", async () => {
    const { client, asDelegate } = buildFake();

    const simulateError = new Error("simulation reverted");
    client.simulateContract.mockRejectedValue(simulateError);

    const onTxHash = vi.fn();

    await expect(
      delegateTo({
        tokenAddress: TOKEN_ADDRESS,
        delegateAddress: DELEGATEE_ADDRESS,
        account: ACCOUNT_ADDRESS,
        walletClient: asDelegate,
        onTxHash,
        chain: MAINNET_CHAIN,
        mode: "fallback",
      }),
    ).rejects.toBe(simulateError);

    expect(client.writeContract).not.toHaveBeenCalled();
    expect(client.waitForTransactionReceipt).not.toHaveBeenCalled();
    expect(onTxHash).not.toHaveBeenCalled();
  });

  it("gasless: relayer 429 rejects with error shape and does not call onTxHash/waitForTransactionReceipt", async () => {
    const { client, asDelegate } = buildFake();

    client.readContract.mockImplementation(({ functionName }) => {
      if (functionName === "name") return Promise.resolve("ENS");
      if (functionName === "nonces") return Promise.resolve(5n);
      throw new Error(`unexpected readContract ${functionName}`);
    });
    client.signTypedData.mockResolvedValue(SIG_WITH_V);

    server.use(
      http.post("/api/gateful/ens/relay/delegate", () =>
        HttpResponse.json(
          { error: "rate limited", code: "RATE_LIMITED" },
          { status: 429 },
        ),
      ),
    );

    const onTxHash = vi.fn();

    let caught: unknown = null;
    try {
      await delegateTo({
        tokenAddress: TOKEN_ADDRESS,
        delegateAddress: DELEGATEE_ADDRESS,
        account: ACCOUNT_ADDRESS,
        walletClient: asDelegate,
        onTxHash,
        mode: "gasless",
      });
    } catch (err) {
      caught = err;
    }

    expect(isRelayerError(caught)).toBe(true);
    if (isRelayerError(caught)) {
      expect(caught.status).toBe(429);
      expect(caught.response?.data?.code).toBe("RATE_LIMITED");
    }

    expect(onTxHash).not.toHaveBeenCalled();
    expect(client.waitForTransactionReceipt).not.toHaveBeenCalled();
  });
});
