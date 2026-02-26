import { Injectable } from '@nestjs/common';
import { StripeClientService } from '../stripe-client/stripe-client.service';

@Injectable()
export class PaymentsRepository {
  /** Creates the payments repository with Stripe API access. */
  constructor(private readonly stripeClientService: StripeClientService) {}

  /** Lists account-level payment method configurations from Stripe. */
  async listPaymentMethodConfigurations(limit = 100) {
    return this.stripeClientService.client.paymentMethodConfigurations.list({
      limit,
    });
  }

  /** Attaches a Stripe payment method to a Stripe customer. */
  async attachPaymentMethod(paymentMethodId: string, stripeCustomerId: string) {
    return this.stripeClientService.client.paymentMethods.attach(
      paymentMethodId,
      {
        customer: stripeCustomerId,
      },
    );
  }

  /** Optionally sets an attached payment method as customer default. */
  async setDefaultPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    return this.stripeClientService.client.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  /** Creates a setup intent for collecting and saving payment methods. */
  async createSetupIntent(args: {
    stripeCustomerId: string;
    usage: 'off_session' | 'on_session';
  }) {
    return this.stripeClientService.client.setupIntents.create({
      customer: args.stripeCustomerId,
      usage: args.usage,
      payment_method_types: ['card'],
      metadata: {
        purpose: 'save_payment_method',
      },
    });
  }

  /** Lists payment methods currently attached to a Stripe customer. */
  async listCustomerPaymentMethods(args: {
    stripeCustomerId: string;
    type?:
      | 'card'
      | 'acss_debit'
      | 'affirm'
      | 'afterpay_clearpay'
      | 'alipay'
      | 'au_becs_debit'
      | 'bacs_debit'
      | 'bancontact'
      | 'blik'
      | 'boleto'
      | 'cashapp'
      | 'customer_balance'
      | 'eps'
      | 'fpx'
      | 'giropay'
      | 'grabpay'
      | 'ideal'
      | 'klarna'
      | 'konbini'
      | 'link'
      | 'oxxo'
      | 'p24'
      | 'paynow'
      | 'paypal'
      | 'promptpay'
      | 'sepa_debit'
      | 'sofort'
      | 'us_bank_account'
      | 'wechat_pay'
      | 'zip';
  }) {
    return this.stripeClientService.client.paymentMethods.list({
      customer: args.stripeCustomerId,
      ...(args.type ? { type: args.type } : {}),
      limit: 100,
    });
  }
}
