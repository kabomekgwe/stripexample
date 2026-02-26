import { Injectable } from '@nestjs/common';
import { PaymentMethodType } from './constants/payment-method-types';
import {
  PaymentMethodPoliciesRepository,
  PaymentMethodPolicyContext,
} from './payment-method-policies.repository';

type PaymentMethodPolicy = {
  paymentMethodType: string;
  currency: string | null;
  country: string | null;
  enabled: boolean;
  priority: number;
};

@Injectable()
export class PaymentMethodPoliciesService {
  constructor(
    private readonly paymentMethodPoliciesRepository: PaymentMethodPoliciesRepository,
  ) {}

  async upsertPolicy(args: {
    paymentMethodType: PaymentMethodType;
    enabled: boolean;
    priority?: number;
    currency?: string;
    country?: string;
  }) {
    const normalizedContext = this.normalizeContext(args);
    await this.paymentMethodPoliciesRepository.upsert({
      paymentMethodType: args.paymentMethodType,
      enabled: args.enabled,
      priority: args.priority ?? 100,
      ...normalizedContext,
    });

    return {
      paymentMethodType: args.paymentMethodType,
      enabled: args.enabled,
      priority: args.priority ?? 100,
      ...normalizedContext,
    };
  }

  async listPolicies() {
    return this.paymentMethodPoliciesRepository.listAll();
  }

  async filterAllowedPaymentMethods(
    accountEnabledMethods: PaymentMethodType[],
    context: PaymentMethodPolicyContext,
  ) {
    const normalizedContext = this.normalizeContext(context);
    const scopedPolicies =
      await this.paymentMethodPoliciesRepository.listForMethods(
        accountEnabledMethods,
        normalizedContext,
      );

    const methods = accountEnabledMethods.filter((method) => {
      const match = this.pickMostSpecificPolicy(method, scopedPolicies);
      if (!match) {
        return true;
      }
      return match.enabled;
    });

    return methods;
  }

  private pickMostSpecificPolicy(
    paymentMethodType: PaymentMethodType,
    policies: PaymentMethodPolicy[],
  ) {
    return policies
      .filter((policy) => policy.paymentMethodType === paymentMethodType)
      .sort((left, right) => {
        const specificityDiff =
          this.scopeSpecificity(right) - this.scopeSpecificity(left);
        if (specificityDiff !== 0) {
          return specificityDiff;
        }
        return left.priority - right.priority;
      })[0];
  }

  private scopeSpecificity(policy: PaymentMethodPolicy) {
    let score = 0;
    if (policy.currency) {
      score += 1;
    }
    if (policy.country) {
      score += 1;
    }
    return score;
  }

  private normalizeContext(args: {
    currency?: string;
    country?: string;
  }): PaymentMethodPolicyContext {
    const currency = args.currency?.trim().toLowerCase();
    const country = args.country?.trim().toUpperCase();
    return {
      currency: currency ? currency : undefined,
      country: country ? country : undefined,
    };
  }
}
