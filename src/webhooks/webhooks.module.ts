import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [PaymentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksRepository, WebhooksService],
})
export class WebhooksModule {}
