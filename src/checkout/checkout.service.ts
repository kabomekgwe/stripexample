import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CheckoutRepository } from './checkout.repository';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Injectable()
export class CheckoutService {
  /** Creates the checkout service with DB, Stripe, and idempotency dependencies. */
  constructor(
    private readonly checkoutRepository: CheckoutRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Creates a checkout session internally and then creates it in Stripe. */
  async createSession(dto: CreateCheckoutSessionDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      'checkout.sessions.create',
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
      const internal = await this.checkoutRepository.create({
        customerId: dto.customerId,
        mode: dto.mode,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      });

      try {
        const stripeSession =
          await this.stripeClientService.client.checkout.sessions.create({
            mode: dto.mode,
            customer: dto.customerId,
            success_url: dto.successUrl,
            cancel_url: dto.cancelUrl,
            line_items: [{ price: dto.stripePriceId, quantity: 1 }],
            metadata: {
              internalCheckoutSessionId: internal.id,
            },
          });

        await this.checkoutRepository.attachStripeSession({
          id: internal.id,
          stripeCheckoutSessionId: stripeSession.id,
          status: stripeSession.status ?? 'open',
        });
      } catch {
        await this.checkoutRepository.markSyncFailed(internal.id);
        throw new ServiceUnavailableException(
          'Checkout session stored in DB, Stripe sync failed and can be retried.',
        );
      }

      const result = await this.checkoutRepository.findById(internal.id);
      await this.idempotencyService.complete(scopedKey, result);

      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }
}
