import { randomUUID } from 'node:crypto';

export const resolveIdempotencyKey = (idempotencyKey?: string) =>
  idempotencyKey ?? randomUUID();
