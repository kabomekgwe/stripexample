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
import { AddMorePaymentMethodsFlowDto } from '../dtos/add-more-payment-methods-flow.dto';
import { AttachPaymentMethodFlowDto } from '../dtos/attach-payment-method-flow.dto';
import { PaymentMethodFlowSummaryDto } from '../dtos/payment-method-flow-summary.dto';
import { PaymentMethodFlowsService } from '../services/payment-method-flows.service';

@Controller('payments/customers/:customerId/payment-methods/flows')
@ApiTags('Payments')
export class PaymentMethodFlowsController {
  constructor(
    private readonly paymentMethodFlowsService: PaymentMethodFlowsService,
  ) {}

  @Post('attach')
  @ApiOperation({
    summary: 'Attach payment method with existence and ownership checks',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Attach flow result' })
  attachPaymentMethod(
    @Param('customerId') customerId: string,
    @Body() dto: AttachPaymentMethodFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodFlowsService.attachPaymentMethodFlow(
      customerId,
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  @Post('add-more')
  @ApiOperation({
    summary: 'Start add-more flow and create setup intent',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Add-more flow setup context' })
  addMorePaymentMethods(
    @Param('customerId') customerId: string,
    @Body() dto: AddMorePaymentMethodsFlowDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentMethodFlowsService.addMorePaymentMethodsFlow(
      customerId,
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get payment-method flow summary for customer UI' })
  @ApiOkResponse({ description: 'Flow summary and available actions' })
  getSummary(
    @Param('customerId') customerId: string,
    @Query() query: PaymentMethodFlowSummaryDto,
  ) {
    return this.paymentMethodFlowsService.getPaymentMethodFlowSummary(
      customerId,
      query,
    );
  }
}
