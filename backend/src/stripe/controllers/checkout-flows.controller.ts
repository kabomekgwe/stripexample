import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCheckoutFlowDto } from '../dtos/create-checkout-flow.dto';
import { CheckoutFlowsService } from '../services/checkout-flows.service';
import { resolveIdempotencyKey } from '../utils/idempotency.util';

@Controller('payments/customers/:customerId/journeys/checkout')
@ApiTags('Payments')
export class CheckoutFlowsController {
  constructor(private readonly checkoutFlowsService: CheckoutFlowsService) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start checkout flow for one-time or recurring billing',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Checkout flow context with next action' })
  startCheckout(
    @Param('customerId') customerId: string,
    @Body() dto: CreateCheckoutFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkoutFlowsService.startCheckoutFlow(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Get(':checkoutSessionId/status')
  @ApiOperation({ summary: 'Get checkout flow status for frontend polling' })
  @ApiOkResponse({ description: 'Checkout flow status and next action' })
  getStatus(
    @Param('customerId') customerId: string,
    @Param('checkoutSessionId') checkoutSessionId: string,
  ) {
    return this.checkoutFlowsService.getCheckoutFlowStatus(
      customerId,
      checkoutSessionId,
    );
  }

  @Post(':checkoutSessionId/recover')
  @ApiOperation({
    summary: 'Recover an expired checkout flow with a new session',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Replacement checkout session details' })
  recover(
    @Param('customerId') customerId: string,
    @Param('checkoutSessionId') checkoutSessionId: string,
    @Body() dto: CreateCheckoutFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkoutFlowsService.recoverExpiredCheckoutFlow(
      customerId,
      checkoutSessionId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }
}
