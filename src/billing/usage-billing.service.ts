import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../infra/redis/redis.service';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { RecordSubscriptionUsageBatchDto } from './dto/record-subscription-usage-batch.dto';
import { RecordSubscriptionUsageDto } from './dto/record-subscription-usage.dto';
import { OutboxService } from './outbox.service';
import { UsageRepository } from './usage.repository';

@Injectable()
export class UsageBillingService {
  /** Creates the usage billing service with queue and Stripe dependencies. */
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly outboxService: OutboxService,
    private readonly stripeClientService: StripeClientService,
    private readonly redisService: RedisService,
  ) {}

  /** Stores monthly usage in DB and enqueues asynchronous Stripe sync. */
  async recordMonthlyUsage(args: {
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
    stripeCustomerId: string;
  }) {
    const usage = await this.usageRepository.upsertMonthlyUsage({
      billingPeriod: args.billingPeriod,
      usageQuantity: args.usageQuantity,
      unitPriceCents: args.unitPriceCents,
    });
    if (!usage) {
      return null;
    }

    await this.outboxService.enqueue({
      topic: 'usage.billing.finalize',
      aggregateId: usage.id,
      payload: {
        usageId: usage.id,
        stripeCustomerId: args.stripeCustomerId,
      },
    });

    return usage;
  }

  /** Records a Stripe billing meter event for usage-based subscriptions. */
  async recordSubscriptionUsage(dto: RecordSubscriptionUsageDto) {
    const meterEvent =
      await this.stripeClientService.client.billing.meterEvents.create({
        event_name: dto.eventName,
        payload: {
          stripe_customer_id: dto.stripeCustomerId,
          value: String(dto.value),
        },
        timestamp: dto.timestamp,
        identifier: dto.identifier,
      });

    return {
      meterEventId: meterEvent.identifier,
      eventName: meterEvent.event_name,
      payload: meterEvent.payload,
      timestamp: meterEvent.timestamp,
    };
  }

  /** Records a batch of Stripe billing meter events. */
  async recordSubscriptionUsageBatch(dto: RecordSubscriptionUsageBatchDto) {
    const continueOnError = dto.continueOnError ?? true;
    const successes: Array<Record<string, unknown>> = [];
    const failures: Array<{ index: number; message: string }> = [];

    for (const [index, event] of dto.events.entries()) {
      try {
        const result = await this.recordSubscriptionUsage(event);
        successes.push({ index, ...result });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown Stripe error';
        failures.push({ index, message });

        if (!continueOnError) {
          break;
        }
      }
    }

    return {
      total: dto.events.length,
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  @Cron('0 5 1 * *')
  /** Processes queued usage events and creates Stripe invoice items. */
  async runMonthlyBillingJob() {
    await this.outboxService.processByTopics(
      ['usage.billing.finalize'],
      async (event) => {
        if (event.topic !== 'usage.billing.finalize') {
          return;
        }

        const usageId = String(event.payload.usageId);
        const usage = await this.usageRepository.findById(usageId);
        if (!usage || usage.finalized || usage.stripeInvoiceItemId) {
          return;
        }

        const lockKey = `lock:usage:${usage.billingPeriod}`;
        const acquired = await this.redisService.client.set(
          lockKey,
          '1',
          'EX',
          90,
          'NX',
        );
        if (!acquired) {
          return;
        }

        try {
          const invoiceItem =
            await this.stripeClientService.client.invoiceItems.create({
              customer: String(event.payload.stripeCustomerId),
              amount: usage.amountCents,
              currency: 'usd',
              description: `Usage charge for ${usage.billingPeriod}`,
              metadata: {
                internalUsageId: usage.id,
              },
            });

          await this.usageRepository.attachStripeInvoiceItem(
            usage.id,
            invoiceItem.id,
          );
          await this.usageRepository.markFinalized(usage.id);
        } finally {
          await this.redisService.client.del(lockKey);
        }
      },
    );
  }
}
