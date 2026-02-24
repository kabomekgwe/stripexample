export type BillingAccountContext = {
  tenantId: string;
  userId?: string;
};

export function buildIdempotencyNamespace(
  account: BillingAccountContext,
  operation: string,
  idempotencyKey: string,
): string {
  return `idempotency:${account.tenantId}:${operation}:${idempotencyKey}`;
}
