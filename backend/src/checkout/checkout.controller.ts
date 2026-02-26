import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('checkout')
@ApiTags('Checkout')
export class CheckoutController {
  /** Creates the checkout controller with session endpoints. */
  constructor(private readonly checkoutService: CheckoutService) {}

  /** Creates a Stripe Checkout Session and persists linkage in DB. */
  @Post('sessions')
  @ApiOperation({ summary: 'Create checkout session' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Checkout session created or reused' })
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
