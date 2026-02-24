import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { stripeWebhookEvents } from '../infra/database/schema';

@Injectable()
export class WebhooksRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async existsByStripeEventId(stripeEventId: string): Promise<boolean> {
    const [result] = await this.databaseService.db
      .select({ id: stripeWebhookEvents.id })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, stripeEventId))
      .limit(1);

    return Boolean(result);
  }

  async create(args: {
    stripeEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }) {
    await this.databaseService.db.insert(stripeWebhookEvents).values({
      stripeEventId: args.stripeEventId,
      type: args.type,
      payload: args.payload,
      status: 'received',
    });
  }

  async markProcessed(stripeEventId: string) {
    await this.databaseService.db
      .update(stripeWebhookEvents)
      .set({ status: 'processed', updatedAt: new Date() })
      .where(eq(stripeWebhookEvents.stripeEventId, stripeEventId));
  }

  async markFailed(stripeEventId: string, error: string) {
    const existing = await this.databaseService.db
      .select({ attemptCount: stripeWebhookEvents.attemptCount })
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, stripeEventId))
      .limit(1);

    const attempts = (existing[0]?.attemptCount ?? 0) + 1;
    await this.databaseService.db
      .update(stripeWebhookEvents)
      .set({
        status: 'failed',
        attemptCount: attempts,
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(stripeWebhookEvents.stripeEventId, stripeEventId));
  }
}
