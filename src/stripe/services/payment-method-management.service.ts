import { Injectable } from '@nestjs/common';
import type { ListCustomerPaymentMethodsDto } from '../../payments/dto/list-customer-payment-methods.dto';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';
import { PaymentsService } from '../../payments/payments.service';
import type { AddMorePaymentMethodsFlowDto } from '../dtos/add-more-payment-methods-flow.dto';
import type { AttachPaymentMethodFlowDto } from '../dtos/attach-payment-method-flow.dto';
import type { PaymentMethodActionDto } from '../dtos/payment-method-action.dto';
import type { PaymentMethodFlowSummaryDto } from '../dtos/payment-method-flow-summary.dto';
import { PaymentMethodFlowsService } from './payment-method-flows.service';

@Injectable()
export class PaymentMethodManagementService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentMethodFlowsService: PaymentMethodFlowsService,
  ) {}

  getSummary(customerId: string, query: PaymentMethodFlowSummaryDto) {
    return this.paymentMethodFlowsService.getPaymentMethodFlowSummary(
      customerId,
      query,
    );
  }

  listMethods(customerId: string, query: ListCustomerPaymentMethodsDto) {
    return this.paymentsService.listCustomerPaymentMethods(customerId, query);
  }

  getDefaultMethod(customerId: string) {
    return this.paymentsService.getDefaultPaymentMethod(customerId);
  }

  listAllowedMethods(context: PaymentMethodPolicyContextDto) {
    return this.paymentsService.listEnabledPaymentMethods(context);
  }

  startAddMethodFlow(
    customerId: string,
    dto: AddMorePaymentMethodsFlowDto,
    idempotencyKey: string,
  ) {
    return this.paymentMethodFlowsService.addMorePaymentMethodsFlow(
      customerId,
      dto,
      idempotencyKey,
    );
  }

  attachMethod(
    customerId: string,
    dto: AttachPaymentMethodFlowDto,
    idempotencyKey: string,
  ) {
    return this.paymentMethodFlowsService.attachPaymentMethodFlow(
      customerId,
      dto,
      idempotencyKey,
    );
  }

  setDefaultMethod(
    customerId: string,
    dto: PaymentMethodActionDto,
    idempotencyKey: string,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(
      {
        customerId,
        paymentMethodId: dto.paymentMethodId,
      },
      idempotencyKey,
    );
  }

  detachMethod(
    customerId: string,
    dto: PaymentMethodActionDto,
    idempotencyKey: string,
  ) {
    return this.paymentsService.detachPaymentMethod(
      {
        customerId,
        paymentMethodId: dto.paymentMethodId,
      },
      idempotencyKey,
    );
  }
}
