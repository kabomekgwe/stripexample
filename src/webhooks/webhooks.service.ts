import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { DatabaseService } from '../infra/database/database.service';
import {
  billingInvoices,
  billingPaymentIntents,
  billingRefunds,
  billingSubscriptions,
} from '../infra/database/schema';
import { PaymentsRepository } from '../payments/payments.repository';
import { RedisService } from '../infra/redis/redis.service';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { WebhooksRepository } from './webhooks.repository';

@Injectable()
export class WebhooksService {
  /** Creates the webhooks service with Stripe verification and persistence dependencies. */
  constructor(
    private readonly stripeClientService: StripeClientService,
    private readonly webhooksRepository: WebhooksRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /** Validates Stripe signature and converts payload to a typed Stripe event. */
  verifyAndBuildEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripeClientService.client.webhooks.constructEvent(
      payload,
      signature,
      this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    );
  }

  /** Deduplicates, locks, persists, and dispatches a Stripe webhook event. */
  async process(event: Stripe.Event): Promise<void> {
    const lockKey = `lock:webhook:${event.id}`;
    const acquired = await this.redisService.client.set(
      lockKey,
      '1',
      'EX',
      60,
      'NX',
    );
    if (!acquired) {
      return;
    }

    try {
      if (await this.webhooksRepository.existsByStripeEventId(event.id)) {
        return;
      }

      await this.webhooksRepository.create({
        stripeEventId: event.id,
        type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      });

      await this.dispatch(event);
      await this.webhooksRepository.markProcessed(event.id);
    } catch (error) {
      await this.webhooksRepository.markFailed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    } finally {
      await this.redisService.client.del(lockKey);
    }
  }

  /** Routes events to the right domain-specific handler. */
  private async dispatch(event: Stripe.Event): Promise<void> {
    if (event.type.startsWith('customer.subscription.')) {
      await this.handleSubscriptionEvent(event);
      return;
    }

    if (event.type.startsWith('invoice.')) {
      await this.handleInvoiceEvent(event);
      return;
    }

    if (event.type.startsWith('payment_intent.')) {
      await this.handlePaymentIntentEvent(event);
      return;
    }

    if (event.type.startsWith('setup_intent.')) {
      await this.handleSetupIntentEvent(event);
      return;
    }

    if (event.type.startsWith('payment_method.')) {
      await this.handlePaymentMethodEvent(event);
      return;
    }

    if (
      event.type.startsWith('charge.refund') ||
      event.type.startsWith('refund.')
    ) {
      await this.handleRefundEvent(event);
    }
  }

  /** Applies subscription lifecycle updates from Stripe to local DB. */
  private async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const internalSubscriptionId =
      subscription.metadata?.internalSubscriptionId;
    if (!internalSubscriptionId) {
      return;
    }

    await this.databaseService.db
      .update(billingSubscriptions)
      .set({
        status: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, internalSubscriptionId));
  }

  /** Applies invoice status and amount updates from Stripe to local DB. */
  private async handleInvoiceEvent(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    await this.databaseService.db
      .update(billingInvoices)
      .set({
        status: invoice.status ?? 'draft',
        amountDueCents: invoice.amount_due,
        amountPaidCents: invoice.amount_paid,
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.stripeInvoiceId, invoice.id));
  }

  /** Applies payment intent status updates from Stripe to local DB. */
  private async handlePaymentIntentEvent(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await this.databaseService.db
      .update(billingPaymentIntents)
      .set({
        status: paymentIntent.status,
        updatedAt: new Date(),
      })
      .where(eq(billingPaymentIntents.stripePaymentIntentId, paymentIntent.id));
  }

  /** Applies refund status updates from Stripe to local DB. */
  private async handleRefundEvent(event: Stripe.Event) {
    const refund = event.data.object as Stripe.Refund;
    await this.databaseService.db
      .update(billingRefunds)
      .set({
        status: refund.status ?? 'pending',
        updatedAt: new Date(),
      })
      .where(eq(billingRefunds.stripeRefundId, refund.id));
  }

  /** Syncs setup intent lifecycle and linked payment method state locally. */
  private async handleSetupIntentEvent(event: Stripe.Event) {
    const setupIntent = event.data.object as Stripe.SetupIntent;
    await this.paymentsRepository.upsertSetupIntentState(setupIntent);

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      return;
    }

    const paymentMethod =
      await this.paymentsRepository.retrievePaymentMethod(paymentMethodId);
    await this.paymentsRepository.upsertPaymentMethodState(
      paymentMethod,
      'attached',
    );

    const stripeCustomerId =
      typeof setupIntent.customer === 'string'
        ? setupIntent.customer
        : setupIntent.customer?.id;
    if (!stripeCustomerId) {
      return;
    }

    const defaultPaymentMethodId =
      await this.paymentsRepository.getDefaultPaymentMethodId(stripeCustomerId);
    await this.paymentsRepository.syncDefaultPaymentMethodFlag({
      stripeCustomerId,
      defaultPaymentMethodId,
    });
  }

  /** Syncs customer payment method attachment and detach events locally. */
  private async handlePaymentMethodEvent(event: Stripe.Event) {
    const paymentMethod = event.data.object as Stripe.PaymentMethod;
    const status =
      event.type === 'payment_method.detached' ? 'detached' : 'attached';
    await this.paymentsRepository.upsertPaymentMethodState(
      paymentMethod,
      status,
    );

    const stripeCustomerId =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

    if (!stripeCustomerId) {
      return;
    }

    const defaultPaymentMethodId =
      await this.paymentsRepository.getDefaultPaymentMethodId(stripeCustomerId);
    await this.paymentsRepository.syncDefaultPaymentMethodFlag({
      stripeCustomerId,
      defaultPaymentMethodId,
    });
  }
}
