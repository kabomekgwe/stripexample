import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutRepository } from './checkout.repository';
import { CheckoutService } from './checkout.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutRepository, CheckoutService],
})
export class CheckoutModule {}
