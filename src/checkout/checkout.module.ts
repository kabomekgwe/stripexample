import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutRepository } from './checkout.repository';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [PaymentsModule],
  controllers: [CheckoutController],
  providers: [CheckoutRepository, CheckoutService],
})
export class CheckoutModule {}
