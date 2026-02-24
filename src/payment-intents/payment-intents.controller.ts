import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentsService } from './payment-intents.service';

@Controller('payment-intents')
export class PaymentIntentsController {
  /** Creates the payment intents controller with create/read handlers. */
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  /** Creates a payment intent in DB first and then in Stripe. */
  @Post()
  create(
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentIntentsService.create(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Returns a payment intent by internal id. */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.paymentIntentsService.getById(id);
  }
}
