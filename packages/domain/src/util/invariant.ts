export class InvariantViolationError extends Error {
  constructor(message: string) {
    super(`Invariant violation: ${message}`);
    this.name = "InvariantViolationError";
  }
}

export function invariant(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new InvariantViolationError(message);
  }
}
