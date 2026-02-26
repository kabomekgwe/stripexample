import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingPaymentMethodPolicies } from '../infra/database/schema';
import { PaymentMethodType } from './constants/payment-method-types';

export type PaymentMethodPolicyContext = {
  currency?: string;
  country?: string;
};

@Injectable()
export class PaymentMethodPoliciesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async upsert(args: {
    paymentMethodType: PaymentMethodType;
    enabled: boolean;
    priority: number;
    currency?: string;
    country?: string;
  }) {
    await this.databaseService.db
      .insert(billingPaymentMethodPolicies)
      .values({
        paymentMethodType: args.paymentMethodType,
        currency: args.currency ?? '',
        country: args.country ?? '',
        enabled: args.enabled,
        priority: args.priority,
      })
      .onConflictDoUpdate({
        target: [
          billingPaymentMethodPolicies.paymentMethodType,
          billingPaymentMethodPolicies.currency,
          billingPaymentMethodPolicies.country,
        ],
        set: {
          enabled: args.enabled,
          priority: args.priority,
          updatedAt: new Date(),
        },
      });
  }

  async listAll() {
    return this.databaseService.db
      .select()
      .from(billingPaymentMethodPolicies)
      .orderBy(
        asc(billingPaymentMethodPolicies.paymentMethodType),
        asc(billingPaymentMethodPolicies.priority),
      );
  }

  async listForMethods(
    paymentMethodTypes: PaymentMethodType[],
    context: PaymentMethodPolicyContext,
  ) {
    if (!paymentMethodTypes.length) {
      return [];
    }

    return this.databaseService.db
      .select()
      .from(billingPaymentMethodPolicies)
      .where(
        and(
          inArray(
            billingPaymentMethodPolicies.paymentMethodType,
            paymentMethodTypes,
          ),
          context.currency
            ? or(
                eq(billingPaymentMethodPolicies.currency, ''),
                eq(billingPaymentMethodPolicies.currency, context.currency),
              )
            : eq(billingPaymentMethodPolicies.currency, ''),
          context.country
            ? or(
                eq(billingPaymentMethodPolicies.country, ''),
                eq(billingPaymentMethodPolicies.country, context.country),
              )
            : eq(billingPaymentMethodPolicies.country, ''),
        ),
      )
      .orderBy(asc(billingPaymentMethodPolicies.priority));
  }
}
