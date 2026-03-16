import { type DelegatorScore, type ProtocolMapping, type WalletAlias, wei } from "./types.js";

/**
 * Consolidate delegator scores by:
 * 1. Applying protocol mappings (contract/proxy → real owner)
 * 2. Applying known wallet aliases (secondary EOA → primary EOA)
 *
 * This runs BEFORE cap calculation so that entities with multiple
 * wallets/contracts have their combined TWB capped as a single participant.
 * All rewards are routed to the canonical (operator/primary) address.
 */
export function consolidateDelegators(
  scores: DelegatorScore[],
  protocolMappings: ProtocolMapping[],
  walletAliases: WalletAlias[],
): DelegatorScore[] {
  // Build a unified address → canonical address mapping.
  // Protocol mappings are applied first, then wallet aliases on top.
  // This handles chains: child → operator, and if operator is itself
  // a secondary alias, it resolves to the primary.
  const addressMap = new Map<string, string>();

  // Step 1: Protocol mappings (proxy/contract → operator)
  for (const mapping of protocolMappings) {
    addressMap.set(
      mapping.childAddress.toLowerCase(),
      mapping.operatorAddress.toLowerCase(),
    );
  }

  // Step 2: Wallet aliases (secondary EOA → primary EOA)
  for (const alias of walletAliases) {
    addressMap.set(
      alias.secondaryAddress.toLowerCase(),
      alias.primaryAddress.toLowerCase(),
    );
  }

  // Resolve transitive chains: if A → B and B → C, then A → C
  function resolve(addr: string): string {
    const seen = new Set<string>();
    let current = addr.toLowerCase();
    while (addressMap.has(current) && !seen.has(current)) {
      seen.add(current);
      current = addressMap.get(current)!;
    }
    return current;
  }

  // Merge scores by canonical address
  const merged = new Map<string, DelegatorScore>();

  for (const score of scores) {
    const canonicalId = resolve(score.delegatorId);

    const existing = merged.get(canonicalId);
    if (existing) {
      if (existing.delegateId.toLowerCase() !== score.delegateId.toLowerCase()) {
        console.warn(
          `[consolidateDelegators] delegateId conflict for canonical address ${canonicalId}: ` +
          `keeping "${existing.delegateId}", discarding "${score.delegateId}" ` +
          `(from delegator "${score.delegatorId}" with TWB=${score.timeWeightedBalance}). ` +
          `Review protocol mappings / wallet aliases.`,
        );
      }
      merged.set(canonicalId, {
        delegatorId: canonicalId,
        delegateId: existing.delegateId,
        timeWeightedBalance: wei(
          existing.timeWeightedBalance + score.timeWeightedBalance,
        ),
      });
    } else {
      merged.set(canonicalId, {
        ...score,
        delegatorId: canonicalId,
      });
    }
  }

  return Array.from(merged.values());
}
