import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [PaymentsModule, InvoicesModule, BillingModule],
  controllers: [WebhooksController],
  providers: [WebhooksRepository, WebhooksService],
})
export class WebhooksModule {}
