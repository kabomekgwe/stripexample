import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { asc } from 'drizzle-orm';
import { PinoLogger } from 'nestjs-pino';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { DatabaseService } from '../infra/database/database.service';
import { billingCustomers } from '../infra/database/schema';
import { addSpanAttributes, runInSpan } from '../observability/tracing.util';
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
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly idempotencyService: IdempotencyService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CustomerCacheService.name);
  }

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
    return runInSpan(
      'customer-cache.get-list',
      {
        'code.function': 'getCustomerListFromCache',
        'db.system': 'redis',
        'cache.key': CUSTOMER_LIST_CACHE_KEY,
      },
      async () => {
        const cached = await this.redisService.client.get(
          CUSTOMER_LIST_CACHE_KEY,
        );
        if (cached) {
          addSpanAttributes({ 'cache.hit': true });
          return JSON.parse(cached) as CachedCustomer[];
        }

        addSpanAttributes({ 'cache.hit': false });
        await this.syncCustomerListToRedis('cache_miss');
        const hydrated = await this.redisService.client.get(
          CUSTOMER_LIST_CACHE_KEY,
        );

        return hydrated ? (JSON.parse(hydrated) as CachedCustomer[]) : [];
      },
    );
  }

  /**
   * Manually syncs customer snapshot with idempotent retries.
   */
  async syncCustomerListOnDemand(idempotencyKey: string) {
    return runInSpan(
      'customer-cache.sync-on-demand',
      {
        'code.function': 'syncCustomerListOnDemand',
        'idempotency.operation': 'customer-cache.sync',
      },
      async () => {
        const scopedKey = `customer-cache.sync.${idempotencyKey}`;
        const cached = await this.idempotencyService.getStoredResult(scopedKey);
        if (cached) {
          addSpanAttributes({ 'idempotency.cache_hit': true });
          return cached;
        }

        const acquired = await this.idempotencyService.start(scopedKey);
        if (!acquired) {
          addSpanAttributes({ 'idempotency.lock_acquired': false });
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
      },
    );
  }

  /**
   * Reads all customers from DB and writes one canonical Redis snapshot.
   */
  async syncCustomerListToRedis(
    reason: 'startup' | 'schedule' | 'cache_miss' | 'manual',
  ) {
    return runInSpan(
      'customer-cache.sync-redis-snapshot',
      {
        'code.function': 'syncCustomerListToRedis',
        'cache.sync.reason': reason,
      },
      async () => {
        const lockAcquired = await this.redisService.client.set(
          CUSTOMER_LIST_CACHE_SYNC_LOCK_KEY,
          '1',
          'EX',
          120,
          'NX',
        );
        if (!lockAcquired) {
          addSpanAttributes({ 'cache.sync.lock_acquired': false });
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

          addSpanAttributes({
            'db.system': 'sqlite',
            'cache.sync.customer_count': customers.length,
          });

          const nowIso = new Date().toISOString();
          const pipeline = this.redisService.client.pipeline();
          pipeline.set(CUSTOMER_LIST_CACHE_KEY, JSON.stringify(customers));
          pipeline.set(
            CUSTOMER_LIST_CACHE_SYNCED_AT_KEY,
            JSON.stringify({
              syncedAt: nowIso,
              reason,
              count: customers.length,
            }),
          );
          await pipeline.exec();

          this.logger.info(
            `Customer list cache synced (${reason}) with ${customers.length} rows.`,
          );
        } finally {
          await this.redisService.client.del(CUSTOMER_LIST_CACHE_SYNC_LOCK_KEY);
        }
      },
    );
  }
}
