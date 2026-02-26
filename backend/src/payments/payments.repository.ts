import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { DatabaseService } from '../infra/database/database.service';
import {
  billingCustomerPaymentMethods,
  billingCustomers,
  billingSetupIntents,
} from '../infra/database/schema';
import type { PaymentMethodType } from './constants/payment-method-types';
import { StripeClientService } from '../stripe-client/stripe-client.service';

@Injectable()
export class PaymentsRepository {
  /** Creates the payments repository with Stripe API access. */
  constructor(
    private readonly stripeClientService: StripeClientService,
    private readonly databaseService: DatabaseService,
  ) {}

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

  /** Detaches a Stripe payment method from its customer. */
  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripeClientService.client.paymentMethods.detach(
      paymentMethodId,
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

  /** Clears the Stripe customer's default payment method. */
  async clearDefaultPaymentMethod(stripeCustomerId: string) {
    return this.stripeClientService.client.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: null as unknown as string,
      },
    });
  }

  /** Fetches a Stripe customer's default payment method id. */
  async getDefaultPaymentMethodId(stripeCustomerId: string) {
    const customer = await this.stripeClientService.client.customers.retrieve(
      stripeCustomerId,
      {
        expand: ['invoice_settings.default_payment_method'],
      },
    );

    if (customer.deleted) {
      return null;
    }

    const defaultPaymentMethod =
      customer.invoice_settings.default_payment_method;
    if (!defaultPaymentMethod) {
      return null;
    }

    if (typeof defaultPaymentMethod === 'string') {
      return defaultPaymentMethod;
    }

    return defaultPaymentMethod.id;
  }

  /** Creates a setup intent for collecting and saving payment methods. */
  async createSetupIntent(args: {
    stripeCustomerId: string;
    usage: 'off_session' | 'on_session';
    paymentMethodTypes: PaymentMethodType[];
  }) {
    return this.stripeClientService.client.setupIntents.create({
      customer: args.stripeCustomerId,
      usage: args.usage,
      payment_method_types: args.paymentMethodTypes,
      metadata: {
        purpose: 'save_payment_method',
      },
    });
  }

  /** Retrieves a setup intent by Stripe id. */
  async retrieveSetupIntent(setupIntentId: string) {
    return this.stripeClientService.client.setupIntents.retrieve(setupIntentId);
  }

  /** Confirms a setup intent with a provided payment method. */
  async confirmSetupIntent(args: {
    setupIntentId: string;
    paymentMethodId: string;
  }) {
    return this.stripeClientService.client.setupIntents.confirm(
      args.setupIntentId,
      {
        payment_method: args.paymentMethodId,
      },
    );
  }

  /** Lists payment methods currently attached to a Stripe customer. */
  async listCustomerPaymentMethods(args: {
    stripeCustomerId: string;
    type?: PaymentMethodType;
  }) {
    return this.stripeClientService.client.paymentMethods.list({
      customer: args.stripeCustomerId,
      ...(args.type ? { type: args.type } : {}),
      limit: 100,
    });
  }

  /** Retrieves a single Stripe payment method by id. */
  async retrievePaymentMethod(paymentMethodId: string) {
    return this.stripeClientService.client.paymentMethods.retrieve(
      paymentMethodId,
    );
  }

  /** Persists or updates payment method state mirrored from Stripe. */
  async upsertPaymentMethodState(
    paymentMethod: Stripe.PaymentMethod,
    status: 'attached' | 'detached',
  ) {
    const stripeCustomerId =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;
    const customerId = stripeCustomerId
      ? await this.findInternalCustomerIdByStripeCustomerId(stripeCustomerId)
      : null;

    await this.databaseService.db
      .insert(billingCustomerPaymentMethods)
      .values({
        customerId,
        stripeCustomerId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        status,
        mandateId: null,
        details: this.buildPaymentMethodDetails(paymentMethod),
      })
      .onConflictDoUpdate({
        target: [billingCustomerPaymentMethods.stripePaymentMethodId],
        set: {
          customerId,
          stripeCustomerId,
          type: paymentMethod.type,
          status,
          mandateId: null,
          details: this.buildPaymentMethodDetails(paymentMethod),
          updatedAt: new Date(),
        },
      });
  }

  /** Keeps local default method flags aligned with Stripe customer default. */
  async syncDefaultPaymentMethodFlag(args: {
    stripeCustomerId: string;
    defaultPaymentMethodId: string | null;
  }) {
    await this.databaseService.db
      .update(billingCustomerPaymentMethods)
      .set({
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(
        eq(
          billingCustomerPaymentMethods.stripeCustomerId,
          args.stripeCustomerId,
        ),
      );

    if (!args.defaultPaymentMethodId) {
      return;
    }

    await this.databaseService.db
      .update(billingCustomerPaymentMethods)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            billingCustomerPaymentMethods.stripePaymentMethodId,
            args.defaultPaymentMethodId,
          ),
          eq(
            billingCustomerPaymentMethods.stripeCustomerId,
            args.stripeCustomerId,
          ),
        ),
      );
  }

  /** Persists or updates setup intent state mirrored from Stripe webhooks. */
  async upsertSetupIntentState(setupIntent: Stripe.SetupIntent) {
    const stripeCustomerId =
      typeof setupIntent.customer === 'string'
        ? setupIntent.customer
        : setupIntent.customer?.id;
    if (!stripeCustomerId) {
      return;
    }

    const stripePaymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    await this.databaseService.db
      .insert(billingSetupIntents)
      .values({
        stripeSetupIntentId: setupIntent.id,
        stripeCustomerId,
        stripePaymentMethodId,
        status: setupIntent.status,
        usage: setupIntent.usage,
        lastSetupError: setupIntent.last_setup_error?.message,
      })
      .onConflictDoUpdate({
        target: [billingSetupIntents.stripeSetupIntentId],
        set: {
          stripeCustomerId,
          stripePaymentMethodId,
          status: setupIntent.status,
          usage: setupIntent.usage,
          lastSetupError: setupIntent.last_setup_error?.message,
          updatedAt: new Date(),
        },
      });
  }

  private async findInternalCustomerIdByStripeCustomerId(
    stripeCustomerId: string,
  ) {
    const [customer] = await this.databaseService.db
      .select({ id: billingCustomers.id })
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId))
      .limit(1);

    return customer?.id ?? null;
  }

  private buildPaymentMethodDetails(paymentMethod: Stripe.PaymentMethod) {
    return {
      billingDetails: paymentMethod.billing_details,
      card: paymentMethod.card,
      usBankAccount: paymentMethod.us_bank_account,
      sepaDebit: paymentMethod.sepa_debit,
      link: paymentMethod.link,
    } satisfies Record<string, unknown>;
  }
}
