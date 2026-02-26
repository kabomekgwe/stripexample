import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { integrationOutbox } from '../infra/database/schema';

@Injectable()
export class OutboxRepository {
  /** Creates the outbox repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Enqueues an integration event for asynchronous processing. */
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

  /** Returns pending outbox events ready to run now. */
  async fetchPending(args?: { limit?: number; topics?: string[] }) {
    const limit = args?.limit ?? 20;
    /**
     * DETAILED READINESS PREDICATE
     * -------------------------------------------------------------------------
     * A row is considered executable when BOTH conditions are true:
     *
     * 1) status = 'pending'
     *    - We only consume events that are not marked done.
     *    - Completed rows are immutable terminal state for consumers.
     *
     * 2) next_run_at <= now
     *    - Supports delayed execution and retry backoff windows.
     *    - Failed rows are pushed into the future by markRetry(...).
     *
     * Together this creates a deterministic queue of ready work while allowing
     * backpressure and retries without external scheduler complexity.
     */
    const byStatusAndRunAt = and(
      eq(integrationOutbox.status, 'pending'),
      lte(integrationOutbox.nextRunAt, new Date()),
    );
    /**
     * DETAILED TOPIC-SCOPED CONSUMPTION
     * -------------------------------------------------------------------------
     * Topic filtering allows one physical outbox table to drive multiple logical
     * pipelines safely.
     *
     * Example use cases:
     * - billing email dispatcher consumes only `billing.*` topics
     * - usage finalizer consumes only `usage.billing.finalize`
     *
     * Benefits:
     * - Workload isolation by concern.
     * - Lower blast radius during partial dependency failures.
     * - Simpler horizontal scaling: run workers per topic family.
     */
    const whereClause = args?.topics?.length
      ? and(byStatusAndRunAt, inArray(integrationOutbox.topic, args.topics))
      : byStatusAndRunAt;

    return this.databaseService.db
      .select()
      .from(integrationOutbox)
      .where(whereClause)
      .orderBy(asc(integrationOutbox.createdAt))
      .limit(limit);
  }

  /** Marks an outbox event as completed. */
  async markDone(id: string) {
    await this.databaseService.db
      .update(integrationOutbox)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(integrationOutbox.id, id));
  }

  /** Schedules retry metadata for a failed outbox event. */
  async markRetry(id: string, attempts: number, error: string) {
    /**
     * DETAILED RETRY POLICY
     * -------------------------------------------------------------------------
     * Backoff formula:
     *   delay_seconds = min(2^attempts, 300)
     *
     * Progression examples:
     * - attempt 1 -> 2s
     * - attempt 2 -> 4s
     * - attempt 3 -> 8s
     * - ...
     * - capped at 300s (5 minutes)
     *
     * Why capped exponential:
     * - Exponential avoids hot-looping unstable dependencies.
     * - Cap prevents excessively long delays for long-lived incidents.
     * - Keeps queue recovery practical once dependency health returns.
     *
     * Persisted metadata fields:
     * - attempts: enables observability and potential dead-letter policy later.
     * - last_error: preserves most recent failure context for debugging.
     * - next_run_at: controls when row becomes executable again.
     */
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
