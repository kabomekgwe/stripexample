import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CustomersRepository } from '../customers/customers.repository';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { buildPaymentMethodConfig } from '../payments/utils/payment-method-config.util';
import { PaymentsService } from '../payments/payments.service';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentsRepository } from './payment-intents.repository';

@Injectable()
export class PaymentIntentsService {
  /** Creates the payment intents service with persistence and Stripe dependencies. */
  constructor(
    private readonly paymentIntentsRepository: PaymentIntentsRepository,
    private readonly stripeClientService: StripeClientService,
    private readonly paymentsService: PaymentsService,
    private readonly customersRepository: CustomersRepository,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Creates a payment intent in DB first and mirrors it to Stripe. */
  async create(dto: CreatePaymentIntentDto, idempotencyKey: string) {
    const currency = (dto.currency ?? 'gbp').toLowerCase();

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
      const customer = await this.customersRepository.findById(dto.customerId);
      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }
      if (!customer.stripeCustomerId) {
        throw new BadRequestException('Customer is not linked to Stripe.');
      }

      const internal = await this.paymentIntentsRepository.create({
        customerId: customer.id,
        amountCents: dto.amountCents,
        currency,
      });
      const paymentMethodConfig = buildPaymentMethodConfig(currency);
      const allowedPaymentMethods =
        await this.paymentsService.resolveAllowedPaymentMethodTypes({
          requestedMethodTypes: paymentMethodConfig.allowed,
          currency,
          country: dto.customerCountry,
        });

      try {
        const stripeIntent =
          await this.stripeClientService.client.paymentIntents.create({
            amount: dto.amountCents,
            currency,
            customer: customer.stripeCustomerId,
            description: dto.description,
            automatic_payment_methods: { enabled: true },
            metadata: {
              internalPaymentIntentId: internal.id,
            },
            payment_method_types: allowedPaymentMethods,
            capture_method: paymentMethodConfig.captureMethod,
          });

        await this.paymentIntentsRepository.attachStripePaymentIntent({
          id: internal.id,
          stripePaymentIntentId: stripeIntent.id,
          status: stripeIntent.status,
        });

        const result = {
          id: internal.id,
          customerId: customer.id,
          stripeCustomerId: customer.stripeCustomerId,
          amountCents: dto.amountCents,
          currency,
          status: stripeIntent.status,
          stripePaymentIntentId: stripeIntent.id,
          clientSecret: stripeIntent.client_secret,
        };
        await this.idempotencyService.complete(scopedKey, result);

        return result;
      } catch {
        await this.paymentIntentsRepository.markSyncFailed(internal.id);
        throw new ServiceUnavailableException(
          'Payment intent stored in DB, Stripe sync failed and can be retried.',
        );
      }
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
