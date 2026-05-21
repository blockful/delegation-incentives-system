import { formatUnits } from "viem";

import type { ErrorResponse, ResponseErrorConfig } from "@anticapture/client";

const INSUFFICIENT_VOTING_POWER = "INSUFFICIENT_VOTING_POWER";
const RATE_LIMITED = "RATE_LIMITED";

const GENERIC_MESSAGE =
  "Something went wrong with your operation. Try again later";
const RATE_LIMITED_MESSAGE = "You've reached maximum operations per day";

const formatThreshold = (raw: bigint, decimals: number, symbol: string) =>
  `${formatUnits(raw, decimals)} ${symbol}`;

export const mapRelayerError = (
  error: unknown,
  context: {
    minVotingPower: bigint | null;
    decimals: number;
    symbol: string;
  },
): string => {
  const relayerError = error as
    | ResponseErrorConfig<ErrorResponse>
    | undefined;
  const data = relayerError?.response?.data;
  const code = data && "code" in data ? data.code : undefined;
  const status = relayerError?.status;

  if (code === INSUFFICIENT_VOTING_POWER) {
    if (context.minVotingPower === null) {
      return "You don't have sufficient voting power to delegate.";
    }
    const formatted = formatThreshold(
      context.minVotingPower,
      context.decimals,
      context.symbol,
    );
    return `You don't have sufficient voting power to delegate. You need minimum ${formatted}`;
  }

  if (code === RATE_LIMITED || status === 429) {
    return RATE_LIMITED_MESSAGE;
  }

  return GENERIC_MESSAGE;
};

export const isUserRejection = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /user (rejected|denied)|rejected (by user|the request)|user cancell?ed/i.test(message);
};

export const isRelayerError = (
  value: unknown,
): value is ResponseErrorConfig<ErrorResponse> => {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("status" in value) ||
    typeof (value as { status: unknown }).status !== "number"
  ) {
    return false;
  }
  return true;
};
