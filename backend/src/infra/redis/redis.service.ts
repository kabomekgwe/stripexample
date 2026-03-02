import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { runInSpan } from '../../observability/tracing.util';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;

  /** Creates and configures the shared Redis client. */
  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(
      this.configService.getOrThrow<string>('REDIS_URL'),
      {
        maxRetriesPerRequest: 10,
        enableOfflineQueue: true,
      },
    );
  }

  /** Gracefully closes Redis connection on shutdown. */
  async onModuleInit(): Promise<void> {
    await runInSpan(
      'infra.redis.ping',
      {
        'code.function': 'onModuleInit',
        'db.system': 'redis',
      },
      async () => {
        try {
          await this.client.ping();
        } catch (err) {
          // Log but don't crash; ioredis will retry if enableOfflineQueue is true
          console.warn('Initial Redis ping failed, but enableOfflineQueue is active. App will continue to start.');
        }
      },
    );
  }

  /** Gracefully closes Redis connection on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
