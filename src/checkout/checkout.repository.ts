import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingCheckoutSessions } from '../infra/database/schema';

@Injectable()
export class CheckoutRepository {
  /** Creates the checkout repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Inserts a new internal checkout session. */
  async create(args: {
    customerId: string;
    mode: 'payment' | 'subscription';
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingCheckoutSessions)
      .values(args)
      .returning({ id: billingCheckoutSessions.id });

    return result;
  }

  /** Stores Stripe checkout session linkage and status. */
  async attachStripeSession(args: {
    id: string;
    stripeCheckoutSessionId: string;
    status: string;
  }) {
    await this.databaseService.db
      .update(billingCheckoutSessions)
      .set({
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        status: args.status,
        updatedAt: new Date(),
      })
      .where(eq(billingCheckoutSessions.id, args.id));
  }

  /** Finds a checkout session by internal id. */
  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingCheckoutSessions)
      .where(eq(billingCheckoutSessions.id, id))
      .limit(1);

    return result ?? null;
  }

  /** Marks checkout sync failure for retry handling. */
  async markSyncFailed(id: string) {
    await this.databaseService.db
      .update(billingCheckoutSessions)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(billingCheckoutSessions.id, id));
  }
}
