import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { CustomersRepository } from '../customers/customers.repository';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import type { PaymentMethodType } from './constants/payment-method-types';
import { PAYMENT_METHOD_TYPES } from './constants/payment-method-types';
import { AttachPaymentMethodDto } from './dto/attach-payment-method.dto';
import { CreateSetupIntentDto } from './dto/create-setup-intent.dto';
import { DetachPaymentMethodDto } from './dto/detach-payment-method.dto';
import { ListCustomerPaymentMethodsDto } from './dto/list-customer-payment-methods.dto';
import { PaymentMethodPolicyContextDto } from './dto/payment-method-policy-context.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { UpsertPaymentMethodPolicyDto } from './dto/upsert-payment-method-policy.dto';
import { PaymentMethodPoliciesService } from './payment-method-policies.service';
import { PaymentsRepository } from './payments.repository';
import { buildIdempotencyNamespace } from './utils/account.util';

type AvailabilityObject = { available?: boolean };
const PAYMENT_METHOD_TYPE_SET = new Set<string>(PAYMENT_METHOD_TYPES);

@Injectable()
export class PaymentsService {
  /** Creates the payments service with repository and idempotency dependencies. */
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly paymentMethodPoliciesService: PaymentMethodPoliciesService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /** Returns enabled account payment method types from Stripe configuration. */
  async listEnabledPaymentMethods(context: PaymentMethodPolicyContextDto = {}) {
    const accountEnabledMethods = await this.listAccountEnabledPaymentMethods();
    const policyFiltered =
      await this.paymentMethodPoliciesService.filterAllowedPaymentMethods(
        accountEnabledMethods,
        context,
      );

    return {
      enabledPaymentMethods: policyFiltered,
      source: {
        accountEnabled: accountEnabledMethods,
      },
    };
  }

  /** Stores or updates a payment method policy rule for the org account. */
  async upsertPaymentMethodPolicy(dto: UpsertPaymentMethodPolicyDto) {
    return this.paymentMethodPoliciesService.upsertPolicy(dto);
  }

  /** Returns all configured organization-level payment method policies. */
  async listPaymentMethodPolicies() {
    return this.paymentMethodPoliciesService.listPolicies();
  }

  /** Attaches a payment method to an existing customer and can set it as default. */
  async attachPaymentMethod(
    dto: AttachPaymentMethodDto,
    idempotencyKey: string,
  ) {
    return this.runIdempotent(
      'payment-methods.attach',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(dto.customerId);
        const attached = await this.paymentsRepository.attachPaymentMethod(
          dto.paymentMethodId,
          customer.stripeCustomerId,
        );

        await this.paymentsRepository.upsertPaymentMethodState(
          attached,
          'attached',
        );
        if (dto.setAsDefault) {
          await this.paymentsRepository.setDefaultPaymentMethod(
            customer.stripeCustomerId,
            dto.paymentMethodId,
          );
          await this.paymentsRepository.syncDefaultPaymentMethodFlag({
            stripeCustomerId: customer.stripeCustomerId,
            defaultPaymentMethodId: dto.paymentMethodId,
          });
        }

        return {
          paymentMethodId: attached.id,
          type: attached.type,
          customerId: dto.customerId,
          stripeCustomerId: customer.stripeCustomerId,
          defaultSet: Boolean(dto.setAsDefault),
        };
      },
    );
  }

  /** Detaches an attached payment method and clears default if required. */
  async detachPaymentMethod(
    dto: DetachPaymentMethodDto,
    idempotencyKey: string,
  ) {
    return this.runIdempotent(
      'payment-methods.detach',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(dto.customerId);
        const methods =
          await this.paymentsRepository.listCustomerPaymentMethods({
            stripeCustomerId: customer.stripeCustomerId,
          });
        const target = methods.data.find(
          (method) => method.id === dto.paymentMethodId,
        );
        if (!target) {
          throw new NotFoundException('Payment method not found for customer.');
        }

        const defaultPaymentMethodId =
          await this.paymentsRepository.getDefaultPaymentMethodId(
            customer.stripeCustomerId,
          );
        if (defaultPaymentMethodId === dto.paymentMethodId) {
          await this.paymentsRepository.clearDefaultPaymentMethod(
            customer.stripeCustomerId,
          );
        }

        const detached = await this.paymentsRepository.detachPaymentMethod(
          dto.paymentMethodId,
        );
        await this.paymentsRepository.upsertPaymentMethodState(
          detached,
          'detached',
        );
        await this.paymentsRepository.syncDefaultPaymentMethodFlag({
          stripeCustomerId: customer.stripeCustomerId,
          defaultPaymentMethodId:
            defaultPaymentMethodId === dto.paymentMethodId
              ? null
              : defaultPaymentMethodId,
        });

        return {
          paymentMethodId: dto.paymentMethodId,
          customerId: dto.customerId,
          stripeCustomerId: customer.stripeCustomerId,
          detached: true,
        };
      },
    );
  }

  /** Creates a setup intent to collect and save a payment method without charging. */
  async createSetupIntent(dto: CreateSetupIntentDto, idempotencyKey: string) {
    return this.runIdempotent(
      'payment-methods.setup-intents.create',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(dto.customerId);
        const allowedMethods = await this.resolveAllowedPaymentMethodTypes({
          requestedMethodTypes: dto.paymentMethodTypes,
          currency: dto.currency,
          country: dto.country,
        });

        const setupIntent = await this.paymentsRepository.createSetupIntent({
          stripeCustomerId: customer.stripeCustomerId,
          usage: dto.usage ?? 'off_session',
          paymentMethodTypes: allowedMethods,
        });

        await this.paymentsRepository.upsertSetupIntentState(setupIntent);

        return {
          setupIntentId: setupIntent.id,
          clientSecret: setupIntent.client_secret,
          status: setupIntent.status,
          paymentMethodTypes: allowedMethods,
        };
      },
    );
  }

  /** Sets a customer's default payment method used for invoices and subscriptions. */
  async setDefaultPaymentMethod(
    dto: SetDefaultPaymentMethodDto,
    idempotencyKey: string,
  ) {
    return this.runIdempotent(
      'payment-methods.default.set',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(dto.customerId);
        await this.paymentsRepository.setDefaultPaymentMethod(
          customer.stripeCustomerId,
          dto.paymentMethodId,
        );
        await this.paymentsRepository.syncDefaultPaymentMethodFlag({
          stripeCustomerId: customer.stripeCustomerId,
          defaultPaymentMethodId: dto.paymentMethodId,
        });

        return {
          customerId: dto.customerId,
          stripeCustomerId: customer.stripeCustomerId,
          defaultPaymentMethodId: dto.paymentMethodId,
        };
      },
    );
  }

  /** Returns current Stripe default payment method for a customer. */
  async getDefaultPaymentMethod(customerId: string) {
    const customer = await this.requireLinkedCustomer(customerId);
    const defaultPaymentMethodId =
      await this.paymentsRepository.getDefaultPaymentMethodId(
        customer.stripeCustomerId,
      );

    if (!defaultPaymentMethodId) {
      return {
        customerId,
        stripeCustomerId: customer.stripeCustomerId,
        defaultPaymentMethod: null,
      };
    }

    const methods = await this.paymentsRepository.listCustomerPaymentMethods({
      stripeCustomerId: customer.stripeCustomerId,
    });
    const matched = methods.data.find(
      (item) => item.id === defaultPaymentMethodId,
    );

    const paymentMethod = matched
      ? matched
      : await this.paymentsRepository.retrievePaymentMethod(
          defaultPaymentMethodId,
        );

    return {
      customerId,
      stripeCustomerId: customer.stripeCustomerId,
      defaultPaymentMethod: this.serializePaymentMethod(
        paymentMethod,
        defaultPaymentMethodId,
      ),
    };
  }

  /** Lists attached payment methods for a customer from Stripe. */
  async listCustomerPaymentMethods(
    customerId: string,
    query: ListCustomerPaymentMethodsDto,
  ) {
    const customer = await this.requireLinkedCustomer(customerId);
    const [methods, defaultPaymentMethodId] = await Promise.all([
      this.paymentsRepository.listCustomerPaymentMethods({
        stripeCustomerId: customer.stripeCustomerId,
        type: query.type,
      }),
      this.paymentsRepository.getDefaultPaymentMethodId(
        customer.stripeCustomerId,
      ),
    ]);

    return {
      customerId,
      stripeCustomerId: customer.stripeCustomerId,
      defaultPaymentMethodId,
      paymentMethods: methods.data.map((method) =>
        this.serializePaymentMethod(method, defaultPaymentMethodId),
      ),
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

  private async runIdempotent<T>(
    operation: string,
    idempotencyKey: string,
    fn: () => Promise<T>,
  ) {
    const scopedKey = buildIdempotencyNamespace(operation, idempotencyKey);
    const cached = await this.idempotencyService.getStoredResult<T>(scopedKey);
    if (cached) {
      return cached;
    }

    if (!(await this.idempotencyService.start(scopedKey))) {
      throw new ConflictException('Request is already being processed.');
    }

    try {
      const result = await fn();
      await this.idempotencyService.complete(scopedKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  private async listAccountEnabledPaymentMethods(): Promise<
    PaymentMethodType[]
  > {
    const configs =
      await this.paymentsRepository.listPaymentMethodConfigurations();
    const activeConfig =
      configs.data.find((config) => config.is_default) ??
      configs.data.find((config) => config.active);

    if (!activeConfig) {
      return [];
    }

    return Object.entries(activeConfig)
      .filter(([key, value]) => this.isPaymentMethodEnabled(key, value))
      .map(([key]) => key)
      .filter((key): key is PaymentMethodType =>
        PAYMENT_METHOD_TYPE_SET.has(key),
      )
      .sort();
  }

  async resolveAllowedPaymentMethodTypes(args: {
    requestedMethodTypes?: PaymentMethodType[];
    currency?: string;
    country?: string;
  }) {
    const accountEnabledMethods = await this.listAccountEnabledPaymentMethods();
    const requestedMethods: PaymentMethodType[] = args.requestedMethodTypes
      ?.length
      ? args.requestedMethodTypes
      : ['card'];

    const requestedAndEnabled = requestedMethods.filter((method) =>
      accountEnabledMethods.includes(method),
    );
    if (!requestedAndEnabled.length) {
      throw new BadRequestException(
        'Requested payment methods are not enabled on the Stripe account.',
      );
    }

    const policyAllowed =
      await this.paymentMethodPoliciesService.filterAllowedPaymentMethods(
        requestedAndEnabled,
        {
          currency: args.currency,
          country: args.country,
        },
      );

    if (!policyAllowed.length) {
      throw new BadRequestException(
        'No payment methods are allowed by organization policy for this context.',
      );
    }

    return policyAllowed;
  }

  private serializePaymentMethod(
    method: Stripe.PaymentMethod,
    defaultPaymentMethodId: string | null,
  ) {
    return {
      id: method.id,
      type: method.type,
      isDefault: method.id === defaultPaymentMethodId,
      billingDetails: method.billing_details,
      card: method.card
        ? {
            brand: method.card.brand,
            last4: method.card.last4,
            expMonth: method.card.exp_month,
            expYear: method.card.exp_year,
            country: method.card.country,
          }
        : null,
      usBankAccount: method.us_bank_account
        ? {
            bankName: method.us_bank_account.bank_name,
            last4: method.us_bank_account.last4,
            accountType: method.us_bank_account.account_type,
          }
        : null,
      sepaDebit: method.sepa_debit
        ? {
            bankCode: method.sepa_debit.bank_code,
            country: method.sepa_debit.country,
            last4: method.sepa_debit.last4,
          }
        : null,
      link: method.link
        ? {
            persistentToken: method.link.persistent_token,
          }
        : null,
    };
  }
}
