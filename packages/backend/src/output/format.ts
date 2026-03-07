import { ONE_ENS } from "@/domain/types.js";

/**
 * Convert Wei (BigInt) to a human-readable ENS decimal string.
 * E.g., 1500000000000000000n → "1.500000000000000000"
 */
export function weiToEnsString(weiValue: bigint): string {
  const isNegative = weiValue < 0n;
  const absValue = isNegative ? -weiValue : weiValue;
  const whole = absValue / ONE_ENS;
  const fraction = absValue % ONE_ENS;
  const fractionStr = fraction.toString().padStart(18, "0");
  const sign = isNegative ? "-" : "";
  return `${sign}${whole}.${fractionStr}`;
}

/**
 * Format a BigInt as a plain string (no scientific notation).
 */
export function bigintToString(value: bigint): string {
  return value.toString();
}
