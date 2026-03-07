import { type AllocationInput, type AllocationResult, wei } from "./types.js";
import { sum, min as bigMin } from "@/util/bigint-math.js";

/**
 * Allocate a pool pro-rata by weight with per-recipient caps.
 * Excess from capped recipients is redistributed iteratively
 * until no recipient exceeds the cap.
 *
 * Guaranteed to converge: each iteration removes at least one recipient.
 * Dust (remainder from BigInt truncation) is added to the largest
 * under-cap allocation with deterministic tie-breaking by address sort.
 */
export function allocateWithCap(
  inputs: AllocationInput[],
  totalPool: bigint,
  perRecipientCap: bigint,
): AllocationResult[] {
  if (inputs.length === 0) return [];

  const totalWeight = sum(inputs.map((i) => i.weight as bigint));
  if (totalWeight === 0n)
    return inputs.map((i) => ({ id: i.id, amount: wei(0n) }));

  // Track final amounts for capped recipients
  const capped = new Map<string, bigint>();
  let remainingPool = totalPool;
  let activeInputs = [...inputs];

  // Iterative redistribution
  for (let iteration = 0; iteration <= inputs.length; iteration++) {
    if (activeInputs.length === 0) break;

    const activeWeight = sum(activeInputs.map((i) => i.weight as bigint));
    if (activeWeight === 0n) break;

    // Compute raw allocation for each active recipient
    const rawAllocations = new Map<string, bigint>();
    for (const input of activeInputs) {
      const raw = ((input.weight as bigint) * remainingPool) / activeWeight;
      rawAllocations.set(input.id, raw);
    }

    // Find recipients that exceed cap
    const newlyCapped: AllocationInput[] = [];
    const stillActive: AllocationInput[] = [];

    for (const input of activeInputs) {
      const raw = rawAllocations.get(input.id)!;
      if (raw > perRecipientCap) {
        newlyCapped.push(input);
        capped.set(input.id, perRecipientCap);
      } else {
        stillActive.push(input);
      }
    }

    // If no one exceeded cap this round, finalize the active recipients
    if (newlyCapped.length === 0) {
      for (const input of activeInputs) {
        capped.set(input.id, rawAllocations.get(input.id)!);
      }
      break;
    }

    // Subtract what was allocated to capped recipients
    const cappedTotal = BigInt(newlyCapped.length) * perRecipientCap;
    remainingPool -= cappedTotal;
    activeInputs = stillActive;
  }

  // Build result array preserving input order
  const allocations: AllocationResult[] = inputs.map((input) => ({
    id: input.id,
    amount: wei(capped.get(input.id) ?? 0n),
  }));

  // Dust handling: assign rounding remainder to largest under-cap allocation
  const distributed = sum(allocations.map((a) => a.amount as bigint));
  const dust = totalPool - distributed;

  if (dust > 0n && allocations.length > 0) {
    // Find recipients that still have room under cap, sorted by amount desc then id asc
    const eligible = allocations
      .filter((a) => (a.amount as bigint) < perRecipientCap)
      .sort((a, b) => {
        const diff = (b.amount as bigint) - (a.amount as bigint);
        if (diff !== 0n) return diff > 0n ? 1 : -1;
        return a.id.localeCompare(b.id);
      });

    if (eligible.length > 0) {
      const recipient = eligible[0];
      const idx = allocations.findIndex((a) => a.id === recipient.id);
      const newAmount = bigMin(
        (recipient.amount as bigint) + dust,
        perRecipientCap,
      );
      allocations[idx] = { id: recipient.id, amount: wei(newAmount) };
    }
    // If everyone is at cap, dust is simply unallocated (returned to treasury)
  }

  return allocations;
}
