import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingUsageMonthly } from '../infra/database/schema';

@Injectable()
export class UsageRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async upsertMonthlyUsage(args: {
    tenantId: string;
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
  }) {
    const existing = await this.findByTenantAndPeriod(
      args.tenantId,
      args.billingPeriod,
    );
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

      return this.findByTenantAndPeriod(args.tenantId, args.billingPeriod);
    }

    const [created] = await this.databaseService.db
      .insert(billingUsageMonthly)
      .values({
        tenantId: args.tenantId,
        billingPeriod: args.billingPeriod,
        usageQuantity: args.usageQuantity,
        unitPriceCents: args.unitPriceCents,
        amountCents,
      })
      .returning({ id: billingUsageMonthly.id });

    return this.findById(created.id);
  }

  async findByTenantAndPeriod(tenantId: string, billingPeriod: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingUsageMonthly)
      .where(
        and(
          eq(billingUsageMonthly.tenantId, tenantId),
          eq(billingUsageMonthly.billingPeriod, billingPeriod),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingUsageMonthly)
      .where(eq(billingUsageMonthly.id, id))
      .limit(1);
    return result ?? null;
  }

  async markFinalized(id: string) {
    await this.databaseService.db
      .update(billingUsageMonthly)
      .set({ finalized: true, updatedAt: new Date() })
      .where(eq(billingUsageMonthly.id, id));
  }

  async attachStripeInvoiceItem(id: string, stripeInvoiceItemId: string) {
    await this.databaseService.db
      .update(billingUsageMonthly)
      .set({ stripeInvoiceItemId, updatedAt: new Date() })
      .where(eq(billingUsageMonthly.id, id));
  }
}
