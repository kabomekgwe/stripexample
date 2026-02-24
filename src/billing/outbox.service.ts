import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  /** Creates the outbox service with retry-aware processing helpers. */
  constructor(private readonly outboxRepository: OutboxRepository) {}

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
    const events = await this.outboxRepository.fetchPending();
    for (const event of events) {
      try {
        await handler({
          topic: event.topic,
          aggregateId: event.aggregateId,
          payload: event.payload,
        });
        await this.outboxRepository.markDone(event.id);
      } catch (error) {
        this.logger.error(`Outbox event failed: ${event.id}`);
        await this.outboxRepository.markRetry(
          event.id,
          event.attempts + 1,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }
}
