import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsRepository, SubscriptionsService],
  exports: [SubscriptionsRepository, SubscriptionsService],
})
export class SubscriptionsModule {}
