import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingSubscriptions } from '../infra/database/schema';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(args: {
    customerId: string;
    planCode: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingSubscriptions)
      .values(args)
      .returning({ id: billingSubscriptions.id });

    return result;
  }

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.id, id))
      .limit(1);

    return result ?? null;
  }

  async attachStripeSubscription(args: {
    id: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }) {
    await this.databaseService.db
      .update(billingSubscriptions)
      .set({
        stripeSubscriptionId: args.stripeSubscriptionId,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, args.id));
  }

  async updateStatus(id: string, status: string) {
    await this.databaseService.db
      .update(billingSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(billingSubscriptions.id, id));
  }

  async cancel(id: string) {
    await this.databaseService.db
      .update(billingSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, id));
  }

  async markSyncFailed(id: string) {
    await this.databaseService.db
      .update(billingSubscriptions)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingSubscriptions.id, id));
  }
}
