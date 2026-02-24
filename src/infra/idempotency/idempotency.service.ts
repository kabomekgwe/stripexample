import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const IN_PROGRESS = 'in_progress';

@Injectable()
export class IdempotencyService {
  /** Creates idempotency helpers backed by Redis. */
  constructor(private readonly redisService: RedisService) {}

  /** Returns completed response payload for a key when available. */
  async getStoredResult<T>(key: string): Promise<T | null> {
    const value = await this.redisService.client.get(key);
    if (!value || value === IN_PROGRESS) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  /** Marks a key as in-progress if it is not already taken. */
  async start(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
    const result = await this.redisService.client.set(
      key,
      IN_PROGRESS,
      'EX',
      ttlSeconds,
      'NX',
    );

    return result === 'OK';
  }

  /** Stores final response payload for a processed idempotent request. */
  async complete<T>(
    key: string,
    value: T,
    ttlSeconds = 24 * 60 * 60,
  ): Promise<void> {
    await this.redisService.client.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );
  }

  /** Clears an idempotency key when processing fails. */
  async clear(key: string): Promise<void> {
    await this.redisService.client.del(key);
  }
}
