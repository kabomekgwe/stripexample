import { Body, Controller, Headers, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundsService } from './refunds.service';

@Controller('refunds')
export class RefundsController {
  /** Creates the refunds controller with refund command handlers. */
  constructor(private readonly refundsService: RefundsService) {}

  /** Creates a refund in DB first and then in Stripe. */
  @Post()
  create(
    @Body() dto: CreateRefundDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.refundsService.create(dto, idempotencyKey ?? randomUUID());
  }
}
