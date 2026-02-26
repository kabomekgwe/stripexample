import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { PaymentsService } from '../payments/payments.service';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  /** Creates the subscriptions service with lifecycle orchestration dependencies. */
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Creates a subscription in DB first and links it to Stripe. */
  async create(dto: CreateSubscriptionDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      'subscriptions.create',
      idempotencyKey,
    );
    const cached = await this.idempotencyService.getStoredResult(scopedKey);
    if (cached) {
      return cached;
    }

    if (!(await this.idempotencyService.start(scopedKey))) {
      throw new ConflictException('Request is already being processed.');
    }

    try {
      const internal = await this.subscriptionsRepository.create({
        customerId: dto.customerId,
        planCode: dto.planCode,
      });
      const allowedPaymentMethods =
        await this.paymentsService.resolveAllowedPaymentMethodTypes({
          requestedMethodTypes: dto.paymentMethodTypes,
          currency: dto.currency,
          country: dto.country,
        });
      const subscriptionPaymentMethods = this.toSubscriptionPaymentMethodTypes(
        allowedPaymentMethods,
      );
      try {
        const stripeSubscription =
          await this.stripeClientService.client.subscriptions.create({
            customer: dto.customerId,
            items: [{ price: dto.stripePriceId }],
            payment_settings: {
              payment_method_types: subscriptionPaymentMethods,
            },
            metadata: {
              internalSubscriptionId: internal.id,
              planCode: dto.planCode,
            },
          });

        await this.subscriptionsRepository.attachStripeSubscription({
          id: internal.id,
          stripeSubscriptionId: stripeSubscription.id,
          status: stripeSubscription.status,
        });
      } catch {
        await this.subscriptionsRepository.markSyncFailed(internal.id);
        throw new ServiceUnavailableException(
          'Subscription stored in DB, Stripe sync failed and can be retried.',
        );
      }

      const result = await this.subscriptionsRepository.findById(internal.id);
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Updates a subscription plan/price and reflects the change in Stripe. */
  async update(id: string, dto: UpdateSubscriptionDto, idempotencyKey: string) {
    const existing = await this.subscriptionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Subscription not found.');
    }

    const scopedKey = buildIdempotencyNamespace(
      `subscriptions.update.${id}`,
      idempotencyKey,
    );
    const cached = await this.idempotencyService.getStoredResult(scopedKey);
    if (cached) {
      return cached;
    }

    if (!(await this.idempotencyService.start(scopedKey))) {
      throw new ConflictException('Request is already being processed.');
    }

    try {
      if (!existing.stripeSubscriptionId) {
        throw new ServiceUnavailableException(
          'Stripe subscription is not linked yet.',
        );
      }

      if (dto.planCode) {
        await this.subscriptionsRepository.updateStatus(
          id,
          'pending_plan_change',
        );
      }

      if (dto.stripePriceId) {
        const stripeSubscription =
          await this.stripeClientService.client.subscriptions.retrieve(
            existing.stripeSubscriptionId,
          );

        await this.stripeClientService.client.subscriptions.update(
          existing.stripeSubscriptionId,
          {
            items: [
              {
                id: stripeSubscription.items.data[0]?.id,
                price: dto.stripePriceId,
              },
            ],
          },
        );
      }

      await this.subscriptionsRepository.updateStatus(id, 'active');
      const result = await this.subscriptionsRepository.findById(id);
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Cancels a subscription locally and then sends cancel to Stripe. */
  async cancel(id: string, idempotencyKey: string) {
    const existing = await this.subscriptionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Subscription not found.');
    }

    const scopedKey = buildIdempotencyNamespace(
      `subscriptions.cancel.${id}`,
      idempotencyKey,
    );
    const cached = await this.idempotencyService.getStoredResult(scopedKey);
    if (cached) {
      return cached;
    }

    if (!(await this.idempotencyService.start(scopedKey))) {
      throw new ConflictException('Request is already being processed.');
    }

    try {
      await this.subscriptionsRepository.cancel(id);
      if (existing.stripeSubscriptionId) {
        await this.stripeClientService.client.subscriptions.cancel(
          existing.stripeSubscriptionId,
        );
      }
      const result = await this.subscriptionsRepository.findById(id);
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Returns a subscription by internal id. */
  async getById(id: string) {
    return this.subscriptionsRepository.findById(id);
  }

  private toSubscriptionPaymentMethodTypes(
    methods: string[],
  ): Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[] {
    const supported =
      new Set<Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType>(
        ['card', 'link', 'customer_balance', 'sepa_debit', 'us_bank_account'],
      );

    const resolved = methods.filter(
      (
        method,
      ): method is Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType =>
        supported.has(
          method as Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType,
        ),
    );

    return resolved.length
      ? resolved
      : ([
          'card',
        ] satisfies Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[]);
  }
}
