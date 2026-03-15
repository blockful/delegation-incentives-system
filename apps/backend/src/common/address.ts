export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * In ERC20MultiDelegate, the token ID is the delegate address cast to uint256.
 */
export function tokenIdToAddress(tokenId: bigint): string {
  return `0x${tokenId.toString(16).padStart(40, "0")}`.toLowerCase();
}
