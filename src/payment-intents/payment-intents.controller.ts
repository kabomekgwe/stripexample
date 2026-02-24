import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentsService } from './payment-intents.service';

@Controller('payment-intents')
@ApiTags('PaymentIntents')
export class PaymentIntentsController {
  /** Creates the payment intents controller with create/read handlers. */
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  /** Creates a payment intent in DB first and then in Stripe. */
  @Post()
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Payment intent created or reused' })
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
  @ApiOperation({ summary: 'Get payment intent by id' })
  @ApiOkResponse({ description: 'Payment intent record' })
  getById(@Param('id') id: string) {
    return this.paymentIntentsService.getById(id);
  }
}
