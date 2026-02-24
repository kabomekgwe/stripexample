import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { buildPaymentMethodConfig } from '../payments/utils/payment-method-config.util';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentsRepository } from './payment-intents.repository';

@Injectable()
export class PaymentIntentsService {
  /** Creates the payment intents service with persistence and Stripe dependencies. */
  constructor(
    private readonly paymentIntentsRepository: PaymentIntentsRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Creates a payment intent in DB first and mirrors it to Stripe. */
  async create(dto: CreatePaymentIntentDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      'payment-intents.create',
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
      const internal = await this.paymentIntentsRepository.create({
        customerId: dto.customerId,
        amountCents: dto.amountCents,
        currency: dto.currency,
      });
      const paymentMethodConfig = buildPaymentMethodConfig(dto.currency);

      try {
        const stripeIntent =
          await this.stripeClientService.client.paymentIntents.create({
            amount: dto.amountCents,
            currency: dto.currency.toLowerCase(),
            customer: dto.customerId,
            description: dto.description,
            automatic_payment_methods: { enabled: true },
            metadata: {
              internalPaymentIntentId: internal.id,
            },
            payment_method_types: paymentMethodConfig.allowed,
            capture_method: paymentMethodConfig.captureMethod,
          });

        await this.paymentIntentsRepository.attachStripePaymentIntent({
          id: internal.id,
          stripePaymentIntentId: stripeIntent.id,
          status: stripeIntent.status,
        });
      } catch {
        await this.paymentIntentsRepository.markSyncFailed(internal.id);
        throw new ServiceUnavailableException(
          'Payment intent stored in DB, Stripe sync failed and can be retried.',
        );
      }

      const result = await this.paymentIntentsRepository.findById(internal.id);
      await this.idempotencyService.complete(scopedKey, result);

      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Returns a payment intent by internal id. */
  async getById(id: string) {
    return this.paymentIntentsRepository.findById(id);
  }
}
