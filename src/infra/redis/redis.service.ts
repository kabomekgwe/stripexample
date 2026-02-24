import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(
      this.configService.getOrThrow<string>('REDIS_URL'),
      {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
