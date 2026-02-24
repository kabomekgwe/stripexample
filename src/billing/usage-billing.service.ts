import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../infra/redis/redis.service';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { OutboxService } from './outbox.service';
import { UsageRepository } from './usage.repository';

@Injectable()
export class UsageBillingService {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly outboxService: OutboxService,
    private readonly stripeClientService: StripeClientService,
    private readonly redisService: RedisService,
  ) {}

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

  @Cron('0 5 1 * *')
  async runMonthlyBillingJob() {
    await this.outboxService.process(async (event) => {
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
    });
  }
}
