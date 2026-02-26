import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { OutboxService } from '../billing/outbox.service';
import { DatabaseService } from '../infra/database/database.service';
import { addSpanAttributes, runInSpan } from '../observability/tracing.util';
import {
  billingPaymentIntents,
  billingRefunds,
} from '../infra/database/schema';
import { InvoicesRepository } from '../invoices/invoices.repository';
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
    private readonly invoicesRepository: InvoicesRepository,
    private readonly outboxService: OutboxService,
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
    return runInSpan(
      'webhooks.process',
      {
        'code.function': 'processWebhookEvent',
        'messaging.system': 'stripe',
        'messaging.operation': 'receive',
        'messaging.message.id': event.id,
        'messaging.destination.name': event.type,
        'stripe.event.id': event.id,
        'stripe.event.type': event.type,
      },
      async () => {
        const lockKey = `lock:webhook:${event.id}`;
        const acquired = await this.redisService.client.set(
          lockKey,
          '1',
          'EX',
          60,
          'NX',
        );
        if (!acquired) {
          addSpanAttributes({ 'webhook.lock_acquired': false });
          return;
        }

        try {
          if (await this.webhooksRepository.existsByStripeEventId(event.id)) {
            addSpanAttributes({ 'webhook.duplicate': true });
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
      },
    );
  }

  /** Routes events to the right domain-specific handler. */
  private async dispatch(event: Stripe.Event): Promise<void> {
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

  /** Applies invoice status and amount updates from Stripe to local DB. */
  private async handleInvoiceEvent(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    addSpanAttributes({ 'stripe.invoice.id': invoice.id });
    const internalInvoice = await this.invoicesRepository.upsertFromStripe({
      stripeInvoiceId: invoice.id,
      amountDueCents: invoice.amount_due,
      amountPaidCents: invoice.amount_paid,
      status: invoice.status ?? 'draft',
      currency: invoice.currency,
    });

    if (event.type !== 'invoice.finalized' || !internalInvoice) {
      if (event.type === 'invoice.payment_succeeded' && internalInvoice) {
        await this.enqueueInvoiceEmailEvent('billing.invoice-paid', {
          internalInvoiceId: internalInvoice.id,
          invoice,
        });
      }

      if (event.type === 'invoice.payment_failed' && internalInvoice) {
        await this.enqueueInvoiceEmailEvent('billing.invoice-payment-failed', {
          internalInvoiceId: internalInvoice.id,
          invoice,
        });
      }

      return;
    }

    await this.enqueueInvoiceEmailEvent('billing.invoice-issued', {
      internalInvoiceId: internalInvoice.id,
      invoice,
    });
  }

  private async enqueueInvoiceEmailEvent(
    topic:
      | 'billing.invoice-issued'
      | 'billing.invoice-paid'
      | 'billing.invoice-payment-failed',
    args: { internalInvoiceId: string; invoice: Stripe.Invoice },
  ) {
    const stripeCustomerId =
      typeof args.invoice.customer === 'string'
        ? args.invoice.customer
        : args.invoice.customer?.id;

    await this.outboxService.enqueue({
      topic,
      aggregateId: args.internalInvoiceId,
      payload: {
        invoiceId: args.internalInvoiceId,
        stripeInvoiceId: args.invoice.id,
        stripeCustomerId,
        amountDueCents: args.invoice.amount_due,
        amountPaidCents: args.invoice.amount_paid,
        currency: args.invoice.currency,
        status: args.invoice.status ?? 'draft',
      },
    });
  }

  /** Applies payment intent status updates from Stripe to local DB. */
  private async handlePaymentIntentEvent(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    addSpanAttributes({ 'stripe.payment_intent.id': paymentIntent.id });
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
    addSpanAttributes({ 'stripe.refund.id': refund.id });
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
    addSpanAttributes({ 'stripe.setup_intent.id': setupIntent.id });
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
    addSpanAttributes({ 'stripe.payment_method.id': paymentMethod.id });
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
