import type {
  Address,
  EligibleDelegator,
  ConsolidatedDelegator,
  WalletAlias,
  Delegation,
  MultiDelegatePosition,
} from "./types.js";

// ──────────────────────────────────────────────────────────
// Step 8: Resolve eligible delegators from 3 sources
// ──────────────────────────────────────────────────────────

/**
 * Build the list of eligible delegators from 3 sources:
 * - Direct delegators (from DelegateChanged events at month-end)
 * - MultiDelegate positions (ERC1155 holders)
 * - Hedgey vesting (vesting contracts delegating, resolved to NFT owner)
 */
export function resolveEligibleDelegators(
  directDelegations: readonly Delegation[],
  multiDelegatePositions: readonly MultiDelegatePosition[],
  vestingContractAddresses: ReadonlySet<Address>,
  vestingNftOwners: ReadonlyMap<Address, Address>,
  activeDelegates: ReadonlySet<Address>,
): EligibleDelegator[] {
  const results: EligibleDelegator[] = [];

  // Direct delegations (including Hedgey vesting contracts)
  for (const d of directDelegations) {
    if (!activeDelegates.has(d.delegate)) continue;

    if (vestingContractAddresses.has(d.delegator)) {
      // Hedgey: resolve vesting contract to NFT owner
      const nftOwner = vestingNftOwners.get(d.delegator);
      if (nftOwner === undefined) continue; // skip if no owner found
      results.push({
        resolvedAddress: nftOwner,
        originalAddress: d.delegator,
        delegateAddress: d.delegate,
        source: "hedgey",
      });
    } else {
      // Regular direct delegation
      results.push({
        resolvedAddress: d.delegator,
        originalAddress: d.delegator,
        delegateAddress: d.delegate,
        source: "direct",
      });
    }
  }

  // MultiDelegate positions (ERC1155 holders)
  for (const pos of multiDelegatePositions) {
    if (!activeDelegates.has(pos.delegate)) continue;
    results.push({
      resolvedAddress: pos.holder,
      originalAddress: pos.holder,
      delegateAddress: pos.delegate,
      source: "multidelegate",
    });
  }

  return results;
}

// ──────────────────────────────────────────────────────────
// Step 9: Consolidate by resolved address
// ──────────────────────────────────────────────────────────

const MAX_ALIAS_HOPS = 100;

/**
 * Follow the alias chain to the final (primary) address.
 * Throws if a cycle is detected (> MAX_ALIAS_HOPS).
 */
function resolveAlias(
  addr: Address,
  aliasMap: ReadonlyMap<Address, Address>,
): Address {
  let current = addr;
  const visited = new Set<Address>();

  for (let i = 0; i < MAX_ALIAS_HOPS; i++) {
    const next = aliasMap.get(current);
    if (next === undefined) return current;

    if (visited.has(next)) {
      throw new Error(
        `Alias cycle detected: ${addr} → ... → ${current} → ${next}`,
      );
    }
    visited.add(current);
    current = next;
  }

  throw new Error(
    `Alias chain exceeded ${MAX_ALIAS_HOPS} hops starting from ${addr}`,
  );
}

/**
 * Apply wallet aliases and merge entries by resolved address.
 * Handles transitive aliases (A->B->C) with cycle detection.
 */
export function consolidateDelegators(
  eligible: readonly EligibleDelegator[],
  aliases: readonly WalletAlias[],
): ConsolidatedDelegator[] {
  // Build alias map: secondary → primary
  const aliasMap = new Map<Address, Address>();
  for (const a of aliases) {
    aliasMap.set(a.secondary, a.primary);
  }

  // Group by final resolved address
  const groups = new Map<Address, EligibleDelegator[]>();

  for (const entry of eligible) {
    const finalAddress = resolveAlias(entry.resolvedAddress, aliasMap);
    let group = groups.get(finalAddress);
    if (!group) {
      group = [];
      groups.set(finalAddress, group);
    }
    group.push(entry);
  }

  // Convert to ConsolidatedDelegator[]
  const result: ConsolidatedDelegator[] = [];
  for (const [resolvedAddress, entries] of groups) {
    result.push({ resolvedAddress, entries });
  }

  return result;
}
