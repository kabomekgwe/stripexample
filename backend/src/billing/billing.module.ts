import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { InvoiceNotificationsService } from './invoice-notifications.service';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';
import { UsageBillingService } from './usage-billing.service';
import { UsageRepository } from './usage.repository';

@Module({
  controllers: [BillingController],
  providers: [
    OutboxRepository,
    OutboxService,
    InvoiceNotificationsService,
    UsageRepository,
    UsageBillingService,
  ],
  exports: [OutboxService, UsageRepository],
})
export class BillingModule {}
