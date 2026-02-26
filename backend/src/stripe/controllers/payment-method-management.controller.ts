import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListCustomerPaymentMethodsDto } from '../../payments/dto/list-customer-payment-methods.dto';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';
import { AddMorePaymentMethodsFlowDto } from '../dtos/add-more-payment-methods-flow.dto';
import { AttachPaymentMethodFlowDto } from '../dtos/attach-payment-method-flow.dto';
import { PaymentMethodActionDto } from '../dtos/payment-method-action.dto';
import { PaymentMethodFlowSummaryDto } from '../dtos/payment-method-flow-summary.dto';
import { PaymentMethodManagementService } from '../services/payment-method-management.service';
import { resolveIdempotencyKey } from '../utils/idempotency.util';

@Controller('payments/customers/:customerId/journeys/payment-methods')
@ApiTags('Payments')
export class PaymentMethodManagementController {
  constructor(
    private readonly paymentMethodManagementService: PaymentMethodManagementService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get payment method management summary for frontend',
  })
  @ApiOkResponse({
    description: 'Payment methods, defaults, and allowed actions',
  })
  getSummary(
    @Param('customerId') customerId: string,
    @Query() query: PaymentMethodFlowSummaryDto,
  ) {
    return this.paymentMethodManagementService.getSummary(customerId, query);
  }

  @Get('list')
  @ApiOperation({ summary: 'List customer payment methods for billing UI' })
  @ApiOkResponse({ description: 'Attached payment methods' })
  list(
    @Param('customerId') customerId: string,
    @Query() query: ListCustomerPaymentMethodsDto,
  ) {
    return this.paymentMethodManagementService.listMethods(customerId, query);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default customer payment method' })
  @ApiOkResponse({ description: 'Default payment method details' })
  getDefault(@Param('customerId') customerId: string) {
    return this.paymentMethodManagementService.getDefaultMethod(customerId);
  }

  @Get('allowed')
  @ApiOperation({
    summary: 'List account-enabled and policy-allowed payment methods',
  })
  @ApiOkResponse({ description: 'Allowed payment methods for current context' })
  listAllowed(@Query() query: PaymentMethodPolicyContextDto) {
    return this.paymentMethodManagementService.listAllowedMethods(query);
  }

  @Post('flows/add')
  @ApiOperation({ summary: 'Start add payment method setup flow' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Setup intent context for frontend' })
  addFlow(
    @Param('customerId') customerId: string,
    @Body() dto: AddMorePaymentMethodsFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodManagementService.startAddMethodFlow(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Post('flows/attach')
  @ApiOperation({
    summary: 'Attach an existing payment method to customer flow',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Attachment result' })
  attach(
    @Param('customerId') customerId: string,
    @Body() dto: AttachPaymentMethodFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodManagementService.attachMethod(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Post('default')
  @ApiOperation({ summary: 'Set default payment method for customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Default payment method set' })
  setDefault(
    @Param('customerId') customerId: string,
    @Body() dto: PaymentMethodActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodManagementService.setDefaultMethod(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }

  @Post('detach')
  @ApiOperation({ summary: 'Detach payment method from customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Payment method detached' })
  detach(
    @Param('customerId') customerId: string,
    @Body() dto: PaymentMethodActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodManagementService.detachMethod(
      customerId,
      dto,
      resolveIdempotencyKey(idempotencyKey),
    );
  }
}
