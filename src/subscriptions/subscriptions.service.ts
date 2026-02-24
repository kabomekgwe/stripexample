import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateSubscriptionDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      dto,
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
      const internal = await this.subscriptionsRepository.create(dto);
      try {
        const stripeSubscription =
          await this.stripeClientService.client.subscriptions.create({
            customer: dto.customerId,
            items: [{ price: dto.stripePriceId }],
            metadata: {
              tenantId: dto.tenantId,
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

  async update(id: string, dto: UpdateSubscriptionDto, idempotencyKey: string) {
    const existing = await this.subscriptionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Subscription not found.');
    }

    const scopedKey = buildIdempotencyNamespace(
      { tenantId: existing.tenantId },
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

  async cancel(id: string, idempotencyKey: string) {
    const existing = await this.subscriptionsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Subscription not found.');
    }

    const scopedKey = buildIdempotencyNamespace(
      { tenantId: existing.tenantId },
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

  async getById(id: string) {
    return this.subscriptionsRepository.findById(id);
  }
}
