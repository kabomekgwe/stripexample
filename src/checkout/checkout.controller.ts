import { Body, Controller, Headers, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('sessions')
  createSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkoutService.createSession(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }
}
