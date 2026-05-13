import type {
  Address,
  EligibleTokenHolder,
  ConsolidatedTokenHolder,
  WalletAlias,
  Delegation,
  MultiDelegatePosition,
} from "./types.js";

export interface VestingPlanOwner {
  readonly planId: string;
  readonly owner: Address;
}

// ──────────────────────────────────────────────────────────
// Step 8: Resolve eligible token holders from 3 sources
// ──────────────────────────────────────────────────────────

/**
 * Build the list of eligible token holders from 3 sources:
 * - Direct token holders (from DelegateChanged events at month-end)
 * - MultiDelegate positions (ERC1155 holders)
 * - Hedgey vesting (vesting contracts delegating, resolved to NFT owner)
 */
export function resolveEligibleTokenHolders(
  directDelegations: readonly Delegation[],
  multiDelegatePositions: readonly MultiDelegatePosition[],
  vestingContractAddresses: ReadonlySet<Address>,
  vestingNftOwners: ReadonlyMap<Address, readonly VestingPlanOwner[]>,
  activeVoters: ReadonlySet<Address>,
): EligibleTokenHolder[] {
  const results: EligibleTokenHolder[] = [];

  // Direct delegations (including Hedgey vesting contracts)
  for (const d of directDelegations) {
    if (!activeVoters.has(d.voter)) continue;

    if (vestingContractAddresses.has(d.tokenHolder)) {
      // Hedgey: resolve vesting contract to NFT owner(s) — one entry per plan
      const plans = vestingNftOwners.get(d.tokenHolder);
      if (!plans || plans.length === 0) continue;
      for (const plan of plans) {
        results.push({
          resolvedAddress: plan.owner,
          originalAddress: d.tokenHolder,
          voterAddress: d.voter,
          source: "hedgey",
          vestingPlanId: plan.planId,
        });
      }
    } else {
      results.push({
        resolvedAddress: d.tokenHolder,
        originalAddress: d.tokenHolder,
        voterAddress: d.voter,
        source: "direct",
      });
    }
  }

  // MultiDelegate positions (ERC1155 holders)
  for (const pos of multiDelegatePositions) {
    if (!activeVoters.has(pos.voter)) continue;
    results.push({
      resolvedAddress: pos.holder,
      originalAddress: pos.holder,
      voterAddress: pos.voter,
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
export function consolidateTokenHolders(
  eligible: readonly EligibleTokenHolder[],
  aliases: readonly WalletAlias[],
): ConsolidatedTokenHolder[] {
  // Build alias map: secondary → primary
  const aliasMap = new Map<Address, Address>();
  for (const a of aliases) {
    aliasMap.set(a.secondary, a.primary);
  }

  // Group by final resolved address
  const groups = new Map<Address, EligibleTokenHolder[]>();

  for (const entry of eligible) {
    const finalAddress = resolveAlias(entry.resolvedAddress, aliasMap);
    let group = groups.get(finalAddress);
    if (!group) {
      group = [];
      groups.set(finalAddress, group);
    }
    group.push(entry);
  }

  const result: ConsolidatedTokenHolder[] = [];
  for (const [resolvedAddress, entries] of groups) {
    result.push({ resolvedAddress, entries });
  }

  return result;
}
