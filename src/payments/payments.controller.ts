import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { ListCustomerPaymentMethodsDto } from './dto/list-customer-payment-methods.dto';
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
  listEnabledPaymentMethods() {
    return this.paymentsService.listEnabledPaymentMethods();
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
