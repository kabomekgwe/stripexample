import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly outboxRepository: OutboxRepository) {}

  async enqueue(args: {
    topic: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }) {
    await this.outboxRepository.enqueue(args);
  }

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
