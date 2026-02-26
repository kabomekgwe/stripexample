import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from './utils/account.util';
import { AttachPaymentMethodDto } from './dto/attach-payment-method.dto';
import { CustomersRepository } from '../customers/customers.repository';
import { PaymentsRepository } from './payments.repository';
import { CreateSetupIntentDto } from './dto/create-setup-intent.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { ListCustomerPaymentMethodsDto } from './dto/list-customer-payment-methods.dto';

type AvailabilityObject = { available?: boolean };

@Injectable()
export class PaymentsService {
  /** Creates the payments service with repository and idempotency dependencies. */
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Returns enabled account payment method types from Stripe configuration. */
  async listEnabledPaymentMethods() {
    const configs =
      await this.paymentsRepository.listPaymentMethodConfigurations();
    const activeConfig =
      configs.data.find((config) => config.is_default) ??
      configs.data.find((config) => config.active);

    if (!activeConfig) {
      return { enabledPaymentMethods: [] as string[] };
    }

    const enabledPaymentMethods = Object.entries(activeConfig)
      .filter(([key, value]) => this.isPaymentMethodEnabled(key, value))
      .map(([key]) => key)
      .sort();

    return { enabledPaymentMethods };
  }

  /** Attaches a payment method to an existing customer and can set it as default. */
  async attachPaymentMethod(
    dto: AttachPaymentMethodDto,
    idempotencyKey: string,
  ) {
    const scopedKey = buildIdempotencyNamespace(
      'payment-methods.attach',
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
      const customer = await this.requireLinkedCustomer(dto.customerId);

      const attached = await this.paymentsRepository.attachPaymentMethod(
        dto.paymentMethodId,
        customer.stripeCustomerId,
      );

      if (dto.setAsDefault) {
        await this.paymentsRepository.setDefaultPaymentMethod(
          customer.stripeCustomerId,
          dto.paymentMethodId,
        );
      }

      const result = {
        paymentMethodId: attached.id,
        type: attached.type,
        customerId: dto.customerId,
        stripeCustomerId: customer.stripeCustomerId,
        defaultSet: Boolean(dto.setAsDefault),
      };
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Creates a setup intent to collect and save a payment method without charging. */
  async createSetupIntent(dto: CreateSetupIntentDto, idempotencyKey: string) {
    const scopedKey = buildIdempotencyNamespace(
      'payment-methods.setup-intents.create',
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
      const customer = await this.requireLinkedCustomer(dto.customerId);
      const setupIntent = await this.paymentsRepository.createSetupIntent({
        stripeCustomerId: customer.stripeCustomerId,
        usage: dto.usage ?? 'off_session',
      });

      const result = {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        status: setupIntent.status,
      };
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Sets a customer's default payment method used for invoices and subscriptions. */
  async setDefaultPaymentMethod(
    dto: SetDefaultPaymentMethodDto,
    idempotencyKey: string,
  ) {
    const scopedKey = buildIdempotencyNamespace(
      'payment-methods.default.set',
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
      const customer = await this.requireLinkedCustomer(dto.customerId);
      await this.paymentsRepository.setDefaultPaymentMethod(
        customer.stripeCustomerId,
        dto.paymentMethodId,
      );

      const result = {
        customerId: dto.customerId,
        stripeCustomerId: customer.stripeCustomerId,
        defaultPaymentMethodId: dto.paymentMethodId,
      };
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Lists attached payment methods for a customer from Stripe. */
  async listCustomerPaymentMethods(
    customerId: string,
    query: ListCustomerPaymentMethodsDto,
  ) {
    const customer = await this.requireLinkedCustomer(customerId);
    const methods = await this.paymentsRepository.listCustomerPaymentMethods({
      stripeCustomerId: customer.stripeCustomerId,
      type: query.type,
    });

    return {
      customerId,
      stripeCustomerId: customer.stripeCustomerId,
      paymentMethods: methods.data.map((method) => ({
        id: method.id,
        type: method.type,
        card: method.card
          ? {
              brand: method.card.brand,
              last4: method.card.last4,
              expMonth: method.card.exp_month,
              expYear: method.card.exp_year,
            }
          : null,
      })),
    };
  }

  /** Checks if a payment method entry is enabled and should be exposed. */
  private isPaymentMethodEnabled(key: string, value: unknown): boolean {
    const nonMethodFields = new Set([
      'id',
      'object',
      'active',
      'application',
      'is_default',
      'livemode',
      'name',
      'parent',
      'created',
      'updated',
    ]);

    if (nonMethodFields.has(key)) {
      return false;
    }

    if (!value || typeof value !== 'object') {
      return false;
    }

    return Boolean((value as AvailabilityObject).available);
  }

  /** Returns a customer record and guarantees it is linked to Stripe. */
  private async requireLinkedCustomer(customerId: string) {
    const customer = await this.customersRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }
    if (!customer.stripeCustomerId) {
      throw new ServiceUnavailableException(
        'Customer is not linked to Stripe.',
      );
    }
    return { stripeCustomerId: customer.stripeCustomerId };
  }
}
