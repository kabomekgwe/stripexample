import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import {
  billingPaymentIntents,
  billingRefunds,
} from '../infra/database/schema';

@Injectable()
export class RefundsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(args: {
    tenantId: string;
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

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingRefunds)
      .where(eq(billingRefunds.id, id))
      .limit(1);
    return result ?? null;
  }

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

  async markSyncFailed(id: string) {
    await this.databaseService.db
      .update(billingRefunds)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingRefunds.id, id));
  }
}
