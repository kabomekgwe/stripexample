import { Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingUsageMonthly } from '../infra/database/schema';

@Injectable()
export class UsageRepository {
  /** Creates the usage repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Upserts monthly usage values and computes amount from quantity x unit price. */
  async upsertMonthlyUsage(args: {
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
  }) {
    const existing = await this.findByPeriod(args.billingPeriod);
    const amountCents = args.usageQuantity * args.unitPriceCents;

    if (existing) {
      await this.databaseService.db
        .update(billingUsageMonthly)
        .set({
          usageQuantity: args.usageQuantity,
          unitPriceCents: args.unitPriceCents,
          amountCents,
          updatedAt: new Date(),
        })
        .where(eq(billingUsageMonthly.id, existing.id));

      return this.findByPeriod(args.billingPeriod);
    }

    const [created] = await this.databaseService.db
      .insert(billingUsageMonthly)
      .values({
        billingPeriod: args.billingPeriod,
        usageQuantity: args.usageQuantity,
        unitPriceCents: args.unitPriceCents,
        amountCents,
      })
      .returning({ id: billingUsageMonthly.id });

    return this.findById(created.id);
  }

  /** Finds monthly usage row by billing period. */
  async findByPeriod(billingPeriod: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingUsageMonthly)
      .where(and(eq(billingUsageMonthly.billingPeriod, billingPeriod)))
      .limit(1);

    return result ?? null;
  }

  /** Finds monthly usage row by internal id. */
  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingUsageMonthly)
      .where(eq(billingUsageMonthly.id, id))
      .limit(1);
    return result ?? null;
  }

  /** Lists finalized usage rows visible to clients from next-month day one. */
  async listVisibleForClient(now: Date) {
    const currentPeriod = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}`;

    return this.databaseService.db
      .select()
      .from(billingUsageMonthly)
      .where(
        and(
          eq(billingUsageMonthly.finalized, true),
          lt(billingUsageMonthly.billingPeriod, currentPeriod),
        ),
      );
  }

  /** Marks monthly usage as finalized for billing closure. */
  async markFinalized(id: string) {
    await this.databaseService.db
      .update(billingUsageMonthly)
      .set({ finalized: true, updatedAt: new Date() })
      .where(eq(billingUsageMonthly.id, id));
  }

  /** Stores Stripe usage event linkage for usage billing. */
  async attachStripeInvoiceItem(id: string, stripeInvoiceItemId: string) {
    await this.databaseService.db
      .update(billingUsageMonthly)
      .set({ stripeInvoiceItemId, updatedAt: new Date() })
      .where(eq(billingUsageMonthly.id, id));
  }
}
