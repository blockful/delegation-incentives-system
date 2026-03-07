import { type DelegatorScore, type ProtocolMapping, wei } from "./types.js";

/**
 * Deduplicate delegator scores using protocol mappings.
 * Child addresses are remapped to their operator, and scores merged by summing TWBs.
 */
export function deduplicateDelegators(
  scores: DelegatorScore[],
  mappings: ProtocolMapping[],
): DelegatorScore[] {
  if (mappings.length === 0) return scores;

  // Build child → operator lookup
  const childToOperator = new Map<string, string>();
  for (const mapping of mappings) {
    const child = mapping.childAddress.toLowerCase();
    const operator = mapping.operatorAddress.toLowerCase();
    childToOperator.set(child, operator);
  }

  // Remap and merge
  const merged = new Map<string, DelegatorScore>();

  for (const score of scores) {
    const normalizedId = score.delegatorId.toLowerCase();
    const operatorId = childToOperator.get(normalizedId) ?? score.delegatorId;

    const existing = merged.get(operatorId.toLowerCase());
    if (existing) {
      // Sum the time-weighted balances
      merged.set(operatorId.toLowerCase(), {
        delegatorId: operatorId,
        delegateId: existing.delegateId, // keep the first delegate
        timeWeightedBalance: wei(
          (existing.timeWeightedBalance as bigint) +
            (score.timeWeightedBalance as bigint),
        ),
      });
    } else {
      merged.set(operatorId.toLowerCase(), {
        ...score,
        delegatorId: operatorId,
      });
    }
  }

  return Array.from(merged.values());
}
