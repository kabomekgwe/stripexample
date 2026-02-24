export function buildIdempotencyNamespace(
  operation: string,
  idempotencyKey: string,
): string {
  return `idempotency:company:${operation}:${idempotencyKey}`;
}
