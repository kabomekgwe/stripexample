import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundsService } from './refunds.service';

@Controller('refunds')
@ApiTags('Refunds')
export class RefundsController {
  /** Creates the refunds controller with refund command handlers. */
  constructor(private readonly refundsService: RefundsService) {}

  /** Creates a refund in DB first and then in Stripe. */
  @Post()
  @ApiOperation({ summary: 'Create refund' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Refund created or reused' })
  create(
    @Body() dto: CreateRefundDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.refundsService.create(dto, idempotencyKey ?? randomUUID());
  }
}
