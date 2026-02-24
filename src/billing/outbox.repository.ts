import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { integrationOutbox } from '../infra/database/schema';

@Injectable()
export class OutboxRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async enqueue(args: {
    topic: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    await this.databaseService.db.insert(integrationOutbox).values({
      topic: args.topic,
      aggregateId: args.aggregateId,
      payload: args.payload,
    });
  }

  async fetchPending(limit = 20) {
    return this.databaseService.db
      .select()
      .from(integrationOutbox)
      .where(
        and(
          eq(integrationOutbox.status, 'pending'),
          lte(integrationOutbox.nextRunAt, new Date()),
        ),
      )
      .orderBy(asc(integrationOutbox.createdAt))
      .limit(limit);
  }

  async markDone(id: string) {
    await this.databaseService.db
      .update(integrationOutbox)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(integrationOutbox.id, id));
  }

  async markRetry(id: string, attempts: number, error: string) {
    const nextRun = new Date(Date.now() + Math.min(2 ** attempts, 300) * 1000);
    await this.databaseService.db
      .update(integrationOutbox)
      .set({
        attempts,
        lastError: error,
        nextRunAt: nextRun,
        updatedAt: new Date(),
      })
      .where(eq(integrationOutbox.id, id));
  }
}
