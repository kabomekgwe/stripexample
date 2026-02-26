import { Injectable } from '@nestjs/common';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';
import { PaymentsService } from '../../payments/payments.service';
import { UpdateSubscriptionDto } from '../../subscriptions/dto/update-subscription.dto';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import type { CreateSubscriptionBillingFlowDto } from '../dtos/create-subscription-billing-flow.dto';

@Injectable()
export class SubscriptionBillingService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createSubscription(
    customerId: string,
    dto: CreateSubscriptionBillingFlowDto,
    idempotencyKey: string,
  ) {
    const subscription = await this.subscriptionsService.create(
      {
        ...dto,
        customerId,
      },
      idempotencyKey,
    );

    const readiness = await this.getPaymentReadiness(customerId, {
      currency: dto.currency,
      country: dto.country,
    });

    return {
      subscription,
      readiness,
    };
  }

  updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
    idempotencyKey: string,
  ) {
    return this.subscriptionsService.update(
      subscriptionId,
      dto,
      idempotencyKey,
    );
  }

  cancelSubscription(subscriptionId: string, idempotencyKey: string) {
    return this.subscriptionsService.cancel(subscriptionId, idempotencyKey);
  }

  async getPaymentReadiness(
    customerId: string,
    context: PaymentMethodPolicyContextDto,
  ) {
    const [defaultMethod, methods, enabled] = await Promise.all([
      this.paymentsService.getDefaultPaymentMethod(customerId),
      this.paymentsService.listCustomerPaymentMethods(customerId, {}),
      this.paymentsService.listEnabledPaymentMethods(context),
    ]);

    const hasDefault = Boolean(defaultMethod.defaultPaymentMethod);
    const hasAttachedMethods = methods.paymentMethods.length > 0;
    const hasAllowedMethods = enabled.enabledPaymentMethods.length > 0;

    return {
      customerId,
      hasDefault,
      hasAttachedMethods,
      hasAllowedMethods,
      nextAction: hasDefault
        ? 'ready_to_bill'
        : hasAttachedMethods
          ? 'set_default_payment_method'
          : 'add_payment_method',
      enabledPaymentMethods: enabled.enabledPaymentMethods,
      defaultPaymentMethod: defaultMethod.defaultPaymentMethod,
    };
  }
}
