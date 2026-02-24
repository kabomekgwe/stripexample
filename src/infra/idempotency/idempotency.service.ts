import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const IN_PROGRESS = 'in_progress';

@Injectable()
export class IdempotencyService {
  constructor(private readonly redisService: RedisService) {}

  async getStoredResult<T>(key: string): Promise<T | null> {
    const value = await this.redisService.client.get(key);
    if (!value || value === IN_PROGRESS) {
      return null;
    }

    return JSON.parse(value) as T;
  }

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

  async clear(key: string): Promise<void> {
    await this.redisService.client.del(key);
  }
}
