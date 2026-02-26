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
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
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
        await this.client.ping();
      },
    );
  }

  /** Gracefully closes Redis connection on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
