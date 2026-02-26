import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AttachPaymentMethodDto } from './dto/attach-payment-method.dto';
import { CreateSetupIntentDto } from './dto/create-setup-intent.dto';
import { DetachPaymentMethodDto } from './dto/detach-payment-method.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { ListCustomerPaymentMethodsDto } from './dto/list-customer-payment-methods.dto';
import { PaymentMethodPolicyContextDto } from './dto/payment-method-policy-context.dto';
import { UpsertPaymentMethodPolicyDto } from './dto/upsert-payment-method-policy.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@ApiTags('Payments')
export class PaymentsController {
  /** Creates the payments controller with payment method management handlers. */
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Returns all enabled payment methods configured on this Stripe account. */
  @Get('payment-methods/enabled')
  @ApiOperation({ summary: 'List enabled account payment methods' })
  @ApiOkResponse({ description: 'Enabled payment method types' })
  listEnabledPaymentMethods(@Query() query: PaymentMethodPolicyContextDto) {
    return this.paymentsService.listEnabledPaymentMethods(query);
  }

  /** Lists configured payment method policies for the org account. */
  @Get('payment-methods/policies')
  @ApiOperation({ summary: 'List org payment method policies' })
  @ApiOkResponse({ description: 'Policy rows' })
  listPaymentMethodPolicies() {
    return this.paymentsService.listPaymentMethodPolicies();
  }

  /** Creates or updates an org policy for a payment method type. */
  @Put('payment-methods/policies')
  @ApiOperation({ summary: 'Upsert org payment method policy' })
  @ApiOkResponse({ description: 'Upserted policy' })
  upsertPaymentMethodPolicy(@Body() dto: UpsertPaymentMethodPolicyDto) {
    return this.paymentsService.upsertPaymentMethodPolicy(dto);
  }

  /** Attaches a payment method to a customer and optionally sets it as default. */
  @Post('payment-methods/attach')
  @ApiOperation({ summary: 'Attach payment method to customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Attached payment method details' })
  attachPaymentMethod(
    @Body() dto: AttachPaymentMethodDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.attachPaymentMethod(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Creates a setup intent for saving a payment method outside payment flow. */
  @Post('setup-intents')
  @ApiOperation({ summary: 'Create setup intent for saved payment method' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Setup intent client secret and status' })
  createSetupIntent(
    @Body() dto: CreateSetupIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createSetupIntent(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Sets a default payment method for billing on a customer. */
  @Post('payment-methods/default')
  @ApiOperation({ summary: 'Set default payment method for customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Default payment method set' })
  setDefaultPaymentMethod(
    @Body() dto: SetDefaultPaymentMethodDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Returns current default payment method for a customer. */
  @Get('customers/:customerId/payment-methods/default')
  @ApiOperation({ summary: 'Get customer default payment method' })
  @ApiOkResponse({ description: 'Customer default payment method' })
  getDefaultPaymentMethod(@Param('customerId') customerId: string) {
    return this.paymentsService.getDefaultPaymentMethod(customerId);
  }

  /** Detaches a payment method from a customer. */
  @Post('payment-methods/detach')
  @ApiOperation({ summary: 'Detach payment method from customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Detached payment method details' })
  detachPaymentMethod(
    @Body() dto: DetachPaymentMethodDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.detachPaymentMethod(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Lists payment methods attached to a customer account. */
  @Get('customers/:customerId/payment-methods')
  @ApiOperation({ summary: 'List customer attached payment methods' })
  @ApiOkResponse({ description: 'Customer payment methods' })
  listCustomerPaymentMethods(
    @Param('customerId') customerId: string,
    @Query() query: ListCustomerPaymentMethodsDto,
  ) {
    return this.paymentsService.listCustomerPaymentMethods(customerId, query);
  }
}
