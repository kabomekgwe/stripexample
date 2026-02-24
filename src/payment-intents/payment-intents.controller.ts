import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentsService } from './payment-intents.service';

@Controller('payment-intents')
export class PaymentIntentsController {
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

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

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.paymentIntentsService.getById(id);
  }
}
