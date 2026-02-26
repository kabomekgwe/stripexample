export function buildIdempotencyNamespace(
  operation: string,
  idempotencyKey: string,
): string {
  /**
   * Builds a stable idempotency namespace for this single-company deployment.
   */
  return `idempotency:company:${operation}:${idempotencyKey}`;
}
