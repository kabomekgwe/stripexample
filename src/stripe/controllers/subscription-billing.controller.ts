import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';
import { UpdateSubscriptionDto } from '../../subscriptions/dto/update-subscription.dto';
import { CreateSubscriptionBillingFlowDto } from '../dtos/create-subscription-billing-flow.dto';
import { SubscriptionBillingService } from '../services/subscription-billing.service';
import { resolveIdempotencyKey } from '../utils/idempotency.util';

@Controller('payments/customers/:customerId/journeys/subscriptions')
@ApiTags('Payments')
export class SubscriptionBillingController {
  constructor(
    private readonly subscriptionBillingService: SubscriptionBillingService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Create subscription billing flow for customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({
    description: 'Subscription creation result and payment readiness',
  })
  createSubscription(
    @Param('customerId') customerId: string,
    @Body() dto: CreateSubscriptionBillingFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionBillingService.createSubscription(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Patch(':subscriptionId')
  @ApiOperation({ summary: 'Update subscription billing settings' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Updated subscription' })
  updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionBillingService.updateSubscription(
      subscriptionId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Post(':subscriptionId/cancel')
  @ApiOperation({ summary: 'Cancel subscription billing flow' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Cancelled subscription' })
  cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionBillingService.cancelSubscription(
      subscriptionId,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Get subscription payment readiness for customer' })
  @ApiOkResponse({ description: 'Readiness and next required action' })
  getReadiness(
    @Param('customerId') customerId: string,
    @Query() query: PaymentMethodPolicyContextDto,
  ) {
    return this.subscriptionBillingService.getPaymentReadiness(
      customerId,
      query,
    );
  }
}
