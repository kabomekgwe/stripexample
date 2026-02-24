import { Module } from '@nestjs/common';
import { PaymentIntentsController } from './payment-intents.controller';
import { PaymentIntentsRepository } from './payment-intents.repository';
import { PaymentIntentsService } from './payment-intents.service';

@Module({
  controllers: [PaymentIntentsController],
  providers: [PaymentIntentsRepository, PaymentIntentsService],
  exports: [PaymentIntentsRepository, PaymentIntentsService],
})
export class PaymentIntentsModule {}
