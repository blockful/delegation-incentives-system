import type { ErrorResponse, ResponseErrorConfig } from "@anticapture/client";
import {
  mapRelayerError,
  isUserRejection,
  isRelayerError,
} from "./gaslessRelayerError";

const GENERIC_MESSAGE =
  "Something went wrong with your operation. Try again later";
const RATE_LIMITED_MESSAGE = "You've reached maximum operations per day";

const baseContext = {
  minVotingPower: null as bigint | null,
  decimals: 18,
  symbol: "ENS",
};

const buildError = (init: {
  code?: string;
  status?: number;
}): ResponseErrorConfig<ErrorResponse> => {
  const status = init.status ?? 400;
  const err = Object.assign(new Error("boom"), {
    status,
  }) as ResponseErrorConfig<ErrorResponse>;
  if (init.code !== undefined) {
    err.response = {
      data: { error: "boom", code: init.code } as ErrorResponse,
      headers: new Headers(),
      status,
      statusText: "",
    };
  }
  return err;
};

describe("mapRelayerError", () => {
  it("returns generic insufficient-voting-power message when minVotingPower is null", () => {
    const result = mapRelayerError(
      buildError({ code: "INSUFFICIENT_VOTING_POWER" }),
      { ...baseContext, minVotingPower: null },
    );
    expect(result).toEqual(
      "You don't have sufficient voting power to delegate.",
    );
    expect(/\d/.test(result)).toBe(false);
  });

  it("includes formatted threshold when minVotingPower is set", () => {
    const result = mapRelayerError(
      buildError({ code: "INSUFFICIENT_VOTING_POWER" }),
      {
        minVotingPower: 100n * 10n ** 18n,
        decimals: 18,
        symbol: "ENS",
      },
    );
    expect(result).toEqual(
      "You don't have sufficient voting power to delegate. You need minimum 100 ENS",
    );
  });

  it("returns rate-limited message when code is RATE_LIMITED", () => {
    const result = mapRelayerError(
      buildError({ code: "RATE_LIMITED" }),
      baseContext,
    );
    expect(result).toEqual(RATE_LIMITED_MESSAGE);
  });

  it("returns rate-limited message when status is 429 without code", () => {
    const result = mapRelayerError(buildError({ status: 429 }), baseContext);
    expect(result).toEqual(RATE_LIMITED_MESSAGE);
  });

  it("returns generic message for unknown shapes", () => {
    expect(mapRelayerError({}, baseContext)).toEqual(GENERIC_MESSAGE);
    expect(mapRelayerError(null, baseContext)).toEqual(GENERIC_MESSAGE);
    expect(mapRelayerError(undefined, baseContext)).toEqual(GENERIC_MESSAGE);
    expect(mapRelayerError(new Error("boom"), baseContext)).toEqual(
      GENERIC_MESSAGE,
    );
  });
});

describe("isUserRejection", () => {
  it('returns true for Error("User rejected the request")', () => {
    expect(isUserRejection(new Error("User rejected the request"))).toBe(true);
  });

  it('returns true for Error("User denied transaction signature")', () => {
    expect(isUserRejection(new Error("User denied transaction signature"))).toBe(
      true,
    );
  });

  it('returns false for Error("Out of gas")', () => {
    expect(isUserRejection(new Error("Out of gas"))).toBe(false);
  });

  it('returns true for the string "rejected by user"', () => {
    expect(isUserRejection("rejected by user")).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(isUserRejection(undefined)).toBe(false);
  });
});

describe("isRelayerError", () => {
  it("returns true for a relayer error with numeric status", () => {
    const err = buildError({ status: 429, code: "RATE_LIMITED" });
    expect(isRelayerError(err)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRelayerError(null)).toBe(false);
  });

  it("returns false for an object missing status", () => {
    expect(isRelayerError({ response: { data: { code: "X" } } })).toBe(false);
  });
});
