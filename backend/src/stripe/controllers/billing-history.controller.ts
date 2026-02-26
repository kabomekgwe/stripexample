import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRefundDto } from '../../refunds/dto/create-refund.dto';
import { BillingHistoryService } from '../services/billing-history.service';
import { resolveIdempotencyKey } from '../utils/idempotency.util';

@Controller('payments/customers/:customerId/journeys/billing-history')
@ApiTags('Payments')
export class BillingHistoryController {
  constructor(private readonly billingHistoryService: BillingHistoryService) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get billing timeline for customer' })
  @ApiOkResponse({
    description: 'Invoices, intents, refunds, and checkouts',
  })
  getTimeline(@Param('customerId') customerId: string) {
    return this.billingHistoryService.getTimeline(customerId);
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get customer invoice details' })
  @ApiOkResponse({ description: 'Invoice details' })
  getInvoice(
    @Param('customerId') customerId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billingHistoryService.getInvoice(customerId, invoiceId);
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Create refund from customer billing timeline' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Refund created' })
  createRefund(
    @Param('customerId') customerId: string,
    @Body() dto: CreateRefundDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.billingHistoryService.createRefundForCustomer(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }
}
