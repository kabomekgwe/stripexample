import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentRecoveryService } from '../services/payment-recovery.service';
import { RetryPaymentIntentFlowDto } from '../dtos/retry-payment-intent-flow.dto';
import { resolveIdempotencyKey } from '../utils/idempotency.util';

@Controller('payments/customers/:customerId/journeys/recovery')
@ApiTags('Payments')
export class PaymentRecoveryController {
  constructor(
    private readonly paymentRecoveryService: PaymentRecoveryService,
  ) {}

  @Get('payment-intents/:paymentIntentId/status')
  @ApiOperation({ summary: 'Get recovery status for a payment intent' })
  @ApiOkResponse({
    description: 'Payment recovery hints for frontend state machine',
  })
  getRecoveryStatus(
    @Param('customerId') customerId: string,
    @Param('paymentIntentId') paymentIntentId: string,
  ) {
    return this.paymentRecoveryService.getPaymentIntentRecoveryStatus(
      customerId,
      paymentIntentId,
    );
  }

  @Post('payment-intents/:paymentIntentId/retry')
  @ApiOperation({
    summary: 'Retry failed payment by creating a replacement intent',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({
    description: 'Replacement payment intent and recovery action',
  })
  retryPayment(
    @Param('customerId') customerId: string,
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() dto: RetryPaymentIntentFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentRecoveryService.retryPayment(
      customerId,
      paymentIntentId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }
}
