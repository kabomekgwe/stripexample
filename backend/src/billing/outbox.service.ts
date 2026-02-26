import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { addSpanAttributes, runInSpan } from '../observability/tracing.util';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxService {
  /** Creates the outbox service with retry-aware processing helpers. */
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OutboxService.name);
  }

  /** Adds an event into the outbox queue. */
  async enqueue(args: {
    topic: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    await this.outboxRepository.enqueue(args);
  }

  /** Processes pending outbox events with centralized error handling. */
  async process(
    handler: (event: {
      topic: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>,
  ) {
    return this.processPending({}, handler);
  }

  /** Processes pending outbox events for selected topics only. */
  async processByTopics(
    topics: string[],
    handler: (event: {
      topic: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>,
  ) {
    return this.processPending({ topics }, handler);
  }

  private async processPending(
    args: { topics?: string[]; limit?: number },
    handler: (event: {
      topic: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>,
  ) {
    /**
     * DETAILED OUTBOX PROCESSING CONTRACT
     * -------------------------------------------------------------------------
     * This method is the single execution engine for both:
     * - process(...)                -> consume all pending topics
     * - processByTopics([...])      -> consume only specific topic families
     *
     * Why this exists:
     * - Prevent duplicate event-loop logic in multiple places.
     * - Keep retry semantics and state transitions consistent.
     * - Preserve DRY across every async integration pipeline.
     *
     * Delivery semantics:
     * - At-least-once delivery (not exactly-once).
     * - If the handler succeeds, event is marked `done`.
     * - If the handler throws, event remains pending and is rescheduled.
     *
     * Ordering semantics:
     * - Repository returns events in ascending created_at order (FIFO intent).
     * - FIFO is best-effort within the selected scope (global or topic-filtered).
     * - Cross-worker strict global ordering is intentionally not guaranteed.
     *
     * Idempotency expectation:
     * - Because delivery is at-least-once, downstream handlers MUST be idempotent.
     * - If a handler side effect can be retried safely, the system remains robust.
     *
     * Failure strategy:
     * - We do not stop the batch on first failure.
     * - Each failed event gets retry metadata (attempt count, next run time, error).
     * - Remaining events continue processing to maximize throughput and isolation.
     *
     * Input args behavior:
     * - topics: narrows consumption to dedicated streams (e.g., invoicing only).
     * - limit: protects worker runtime and DB load by bounded batch size.
     */
    return runInSpan(
      'outbox.process-pending',
      {
        'code.function': 'processPending',
        'outbox.filter.topic_count': args.topics?.length,
      },
      async () => {
        const events = await this.outboxRepository.fetchPending(args);
        addSpanAttributes({ 'outbox.batch.size': events.length });

        for (const event of events) {
          try {
            await runInSpan(
              'outbox.process-event',
              {
                'outbox.event.id': event.id,
                'messaging.destination.name': event.topic,
                'outbox.event.attempt': event.attempts,
              },
              async () => {
                await handler({
                  topic: event.topic,
                  aggregateId: event.aggregateId,
                  payload: event.payload,
                });
                await this.outboxRepository.markDone(event.id);
              },
            );
          } catch (error) {
            /**
             * DETAILED FAILURE BEHAVIOR
             * ---------------------------------------------------------------------
             * Important: we intentionally do NOT rethrow here.
             *
             * Reasoning:
             * - Throwing would abort the entire batch and starve unrelated events.
             * - A single failing integration should not block all other topics.
             *
             * What we do instead:
             * 1) Log event-level failure for observability.
             * 2) Persist retry metadata (attempt increment + exponential backoff).
             * 3) Continue to next event.
             *
             * Operational benefit:
             * - Better resilience under partial outage scenarios.
             * - Predictable recovery once dependency recovers.
             */
            this.logger.error(`Outbox event failed: ${event.id}`);
            await this.outboxRepository.markRetry(
              event.id,
              event.attempts + 1,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }
      },
    );
  }
}
