import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingPaymentIntents } from '../infra/database/schema';

@Injectable()
export class PaymentIntentsRepository {
  /** Creates the payment intent repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Inserts a new internal payment intent. */
  async create(args: {
    customerId: string;
    amountCents: number;
    currency: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingPaymentIntents)
      .values({
        customerId: args.customerId,
        amountCents: args.amountCents,
        currency: args.currency.toLowerCase(),
      })
      .returning({ id: billingPaymentIntents.id });

    return result;
  }

  /** Stores Stripe payment intent linkage and latest status. */
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

  /** Finds a payment intent by internal id. */
  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingPaymentIntents)
      .where(eq(billingPaymentIntents.id, id))
      .limit(1);

    return result ?? null;
  }

  /** Marks payment intent sync failure for later retry. */
  async markSyncFailed(id: string): Promise<void> {
    await this.databaseService.db
      .update(billingPaymentIntents)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingPaymentIntents.id, id));
  }
}
