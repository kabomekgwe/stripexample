import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import {
  billingPaymentIntents,
  billingRefunds,
} from '../infra/database/schema';

@Injectable()
export class RefundsRepository {
  /** Creates the refunds repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Inserts a new internal refund request row. */
  async create(args: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingRefunds)
      .values(args)
      .returning({ id: billingRefunds.id });
    return result;
  }

  /** Stores Stripe refund linkage and latest status. */
  async attachStripeRefund(args: {
    id: string;
    stripeRefundId: string;
    status: string;
  }) {
    await this.databaseService.db
      .update(billingRefunds)
      .set({
        stripeRefundId: args.stripeRefundId,
        status: args.status,
        updatedAt: new Date(),
      })
      .where(eq(billingRefunds.id, args.id));
  }

  /** Finds a refund by internal id. */
  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingRefunds)
      .where(eq(billingRefunds.id, id))
      .limit(1);
    return result ?? null;
  }

  /** Finds Stripe payment intent id mapped from internal payment intent id. */
  async findPaymentIntentByInternalId(id: string) {
    const [result] = await this.databaseService.db
      .select({
        stripePaymentIntentId: billingPaymentIntents.stripePaymentIntentId,
      })
      .from(billingPaymentIntents)
      .where(eq(billingPaymentIntents.id, id))
      .limit(1);
    return result ?? null;
  }

  /** Marks refund sync failure for retry handling. */
  async markSyncFailed(id: string) {
    await this.databaseService.db
      .update(billingRefunds)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingRefunds.id, id));
  }
}
