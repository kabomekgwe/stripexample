import { Injectable } from '@nestjs/common';
import { addSpanAttributes, runInSpan } from '../../observability/tracing.util';
import { RedisService } from '../redis/redis.service';

const IN_PROGRESS = 'in_progress';

@Injectable()
export class IdempotencyService {
  /** Creates idempotency helpers backed by Redis. */
  constructor(private readonly redisService: RedisService) {}

  /** Returns completed response payload for a key when available. */
  async getStoredResult<T>(key: string): Promise<T | null> {
    return runInSpan(
      'idempotency.get-stored-result',
      {
        'code.function': 'getStoredResult',
        'db.system': 'redis',
        'idempotency.key.namespace': this.getNamespace(key),
      },
      async () => {
        const value = await this.redisService.client.get(key);
        const isHit = Boolean(value && value !== IN_PROGRESS);
        addSpanAttributes({ 'idempotency.cache_hit': isHit });
        if (!isHit) {
          return null;
        }

        return JSON.parse(value as string) as T;
      },
    );
  }

  /** Marks a key as in-progress if it is not already taken. */
  async start(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
    return runInSpan(
      'idempotency.start',
      {
        'code.function': 'start',
        'db.system': 'redis',
        'idempotency.key.namespace': this.getNamespace(key),
        'idempotency.ttl_seconds': ttlSeconds,
      },
      async () => {
        const result = await this.redisService.client.set(
          key,
          IN_PROGRESS,
          'EX',
          ttlSeconds,
          'NX',
        );

        const lockAcquired = result === 'OK';
        addSpanAttributes({ 'idempotency.lock_acquired': lockAcquired });
        return lockAcquired;
      },
    );
  }

  /** Stores final response payload for a processed idempotent request. */
  async complete<T>(
    key: string,
    value: T,
    ttlSeconds = 24 * 60 * 60,
  ): Promise<void> {
    await runInSpan(
      'idempotency.complete',
      {
        'code.function': 'complete',
        'db.system': 'redis',
        'idempotency.key.namespace': this.getNamespace(key),
        'idempotency.ttl_seconds': ttlSeconds,
      },
      async () => {
        await this.redisService.client.set(
          key,
          JSON.stringify(value),
          'EX',
          ttlSeconds,
        );
      },
    );
  }

  /** Clears an idempotency key when processing fails. */
  async clear(key: string): Promise<void> {
    await runInSpan(
      'idempotency.clear',
      {
        'code.function': 'clear',
        'db.system': 'redis',
        'idempotency.key.namespace': this.getNamespace(key),
      },
      async () => {
        await this.redisService.client.del(key);
      },
    );
  }

  private getNamespace(key: string) {
    return key.split('.').slice(0, 2).join('.');
  }
}
