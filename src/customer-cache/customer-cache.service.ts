import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { asc } from 'drizzle-orm';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { DatabaseService } from '../infra/database/database.service';
import { billingCustomers } from '../infra/database/schema';
import { RedisService } from '../infra/redis/redis.service';
import {
  CUSTOMER_LIST_CACHE_KEY,
  CUSTOMER_LIST_CACHE_SYNC_LOCK_KEY,
  CUSTOMER_LIST_CACHE_SYNCED_AT_KEY,
  CUSTOMER_LIST_SYNC_CRON,
} from './customer-cache.constants';

type CachedCustomer = {
  id: string;
  userId: string | null;
  email: string;
  stripeCustomerId: string | null;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CustomerCacheService implements OnModuleInit {
  private readonly logger = new Logger(CustomerCacheService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Startup hydration so the first customer list request is Redis-first.
   *
   * Real-world rationale:
   * - App boot often coincides with traffic spikes after deploys/restarts.
   * - Prewarming avoids N concurrent requests hammering the DB for the same list.
   * - Makes cold-start behavior deterministic for API latency.
   */
  async onModuleInit() {
    await this.syncCustomerListToRedis('startup');
  }

  @Cron(CUSTOMER_LIST_SYNC_CRON)
  /**
   * Scheduled reconciliation at 01:00 and 13:00 UTC.
   *
   * This is a common enterprise pattern where customer/account snapshots are
   * refreshed during low/mid-traffic windows to keep read-heavy endpoints fast.
   */
  async syncCustomerListOnSchedule() {
    await this.syncCustomerListToRedis('schedule');
  }

  /**
   * Returns customer list from Redis, hydrating from DB if cache is missing.
   */
  async getCustomerListFromCache() {
    const cached = await this.redisService.client.get(CUSTOMER_LIST_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as CachedCustomer[];
    }

    await this.syncCustomerListToRedis('cache_miss');
    const hydrated = await this.redisService.client.get(
      CUSTOMER_LIST_CACHE_KEY,
    );

    return hydrated ? (JSON.parse(hydrated) as CachedCustomer[]) : [];
  }

  /**
   * Manually syncs customer snapshot with idempotent retries.
   */
  async syncCustomerListOnDemand(idempotencyKey: string) {
    const scopedKey = `customer-cache.sync.${idempotencyKey}`;
    const cached = await this.idempotencyService.getStoredResult(scopedKey);
    if (cached) {
      return cached;
    }

    const acquired = await this.idempotencyService.start(scopedKey);
    if (!acquired) {
      return {
        accepted: false,
        message: 'Cache sync request is already being processed.',
      };
    }

    try {
      await this.syncCustomerListToRedis('manual');
      const metadata = await this.redisService.client.get(
        CUSTOMER_LIST_CACHE_SYNCED_AT_KEY,
      );
      const result = {
        accepted: true,
        metadata: metadata ? JSON.parse(metadata) : null,
      };
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /**
   * Reads all customers from DB and writes one canonical Redis snapshot.
   */
  async syncCustomerListToRedis(
    reason: 'startup' | 'schedule' | 'cache_miss' | 'manual',
  ) {
    const lockAcquired = await this.redisService.client.set(
      CUSTOMER_LIST_CACHE_SYNC_LOCK_KEY,
      '1',
      'EX',
      120,
      'NX',
    );
    if (!lockAcquired) {
      return;
    }

    try {
      const customers = await this.databaseService.db
        .select({
          id: billingCustomers.id,
          userId: billingCustomers.userId,
          email: billingCustomers.email,
          stripeCustomerId: billingCustomers.stripeCustomerId,
          syncStatus: billingCustomers.syncStatus,
          createdAt: billingCustomers.createdAt,
          updatedAt: billingCustomers.updatedAt,
        })
        .from(billingCustomers)
        .orderBy(asc(billingCustomers.createdAt));

      const nowIso = new Date().toISOString();
      const pipeline = this.redisService.client.pipeline();
      pipeline.set(CUSTOMER_LIST_CACHE_KEY, JSON.stringify(customers));
      pipeline.set(
        CUSTOMER_LIST_CACHE_SYNCED_AT_KEY,
        JSON.stringify({ syncedAt: nowIso, reason, count: customers.length }),
      );
      await pipeline.exec();

      this.logger.log(
        `Customer list cache synced (${reason}) with ${customers.length} rows.`,
      );
    } finally {
      await this.redisService.client.del(CUSTOMER_LIST_CACHE_SYNC_LOCK_KEY);
    }
  }
}
