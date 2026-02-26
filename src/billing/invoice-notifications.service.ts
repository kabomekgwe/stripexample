import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

type InvoiceEmailEvent = {
  topic: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class InvoiceNotificationsService {
  private readonly logger = new Logger(InvoiceNotificationsService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/1 * * * *')
  /** Delivers invoice email events to an internal email webhook. */
  async dispatchInvoiceEmailEvents() {
    const webhookUrl = this.configService.get<string>(
      'BILLING_EMAIL_WEBHOOK_URL',
    );
    if (!webhookUrl) {
      return;
    }

    await this.outboxService.processByTopics(
      [
        'billing.invoice-issued',
        'billing.invoice-paid',
        'billing.invoice-payment-failed',
      ],
      async (event) => this.sendToEmailService(webhookUrl, event),
    );
  }

  private async sendToEmailService(url: string, event: InvoiceEmailEvent) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        topic: event.topic,
        aggregateId: event.aggregateId,
        payload: event.payload,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      this.logger.error(
        `Email webhook failed with status ${response.status}: ${responseText}`,
      );
      throw new Error('Invoice email webhook delivery failed.');
    }
  }
}
