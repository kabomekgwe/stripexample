import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundsRepository } from './refunds.repository';

@Injectable()
export class RefundsService {
  constructor(
    private readonly refundsRepository: RefundsRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(dto: CreateRefundDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      dto,
      'refunds.create',
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
      const paymentIntent =
        await this.refundsRepository.findPaymentIntentByInternalId(
          dto.paymentIntentId,
        );
      if (!paymentIntent?.stripePaymentIntentId) {
        throw new NotFoundException('Linked Stripe payment intent not found.');
      }

      const internal = await this.refundsRepository.create(dto);
      try {
        const stripeRefund =
          await this.stripeClientService.client.refunds.create({
            payment_intent: paymentIntent.stripePaymentIntentId,
            amount: dto.amountCents,
            metadata: {
              tenantId: dto.tenantId,
              internalRefundId: internal.id,
            },
          });

        await this.refundsRepository.attachStripeRefund({
          id: internal.id,
          stripeRefundId: stripeRefund.id,
          status: stripeRefund.status ?? 'pending',
        });
      } catch {
        await this.refundsRepository.markSyncFailed(internal.id);
        throw new ServiceUnavailableException(
          'Refund stored in DB, Stripe sync failed and can be retried.',
        );
      }

      const result = await this.refundsRepository.findById(internal.id);
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }
}
