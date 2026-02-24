import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingPaymentIntents } from '../infra/database/schema';

@Injectable()
export class PaymentIntentsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(args: {
    tenantId: string;
    customerId: string;
    amountCents: number;
    currency: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingPaymentIntents)
      .values({
        tenantId: args.tenantId,
        customerId: args.customerId,
        amountCents: args.amountCents,
        currency: args.currency.toLowerCase(),
      })
      .returning({ id: billingPaymentIntents.id });

    return result;
  }

  async attachStripePaymentIntent(args: {
    id: string;
    stripePaymentIntentId: string;
    status: string;
  }): Promise<void> {
    await this.databaseService.db
      .update(billingPaymentIntents)
      .set({
        stripePaymentIntentId: args.stripePaymentIntentId,
        status: args.status,
        updatedAt: new Date(),
      })
      .where(eq(billingPaymentIntents.id, args.id));
  }

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingPaymentIntents)
      .where(eq(billingPaymentIntents.id, id))
      .limit(1);

    return result ?? null;
  }

  async markSyncFailed(id: string): Promise<void> {
    await this.databaseService.db
      .update(billingPaymentIntents)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingPaymentIntents.id, id));
  }
}
