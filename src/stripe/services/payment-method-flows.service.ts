import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CustomersRepository } from '../../customers/customers.repository';
import { IdempotencyService } from '../../infra/idempotency/idempotency.service';
import {
  PAYMENT_METHOD_TYPES,
  type PaymentMethodType,
} from '../../payments/constants/payment-method-types';
import { PaymentsRepository } from '../../payments/payments.repository';
import { PaymentsService } from '../../payments/payments.service';
import { buildIdempotencyNamespace } from '../../payments/utils/account.util';
import type { AddMorePaymentMethodsFlowDto } from '../dtos/add-more-payment-methods-flow.dto';
import type { AttachPaymentMethodFlowDto } from '../dtos/attach-payment-method-flow.dto';
import type { PaymentMethodFlowSummaryDto } from '../dtos/payment-method-flow-summary.dto';

const PAYMENT_METHOD_TYPE_SET = new Set<string>(PAYMENT_METHOD_TYPES);

@Injectable()
export class PaymentMethodFlowsService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async attachPaymentMethodFlow(
    customerId: string,
    dto: AttachPaymentMethodFlowDto,
    idempotencyKey: string,
  ) {
    return this.runIdempotent(
      'payment-methods.flows.attach',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(customerId);
        const retrieved = await this.paymentsRepository.retrievePaymentMethod(
          dto.paymentMethodId,
        );

        if (!PAYMENT_METHOD_TYPE_SET.has(retrieved.type)) {
          throw new BadRequestException(
            'Payment method type is not supported by this service.',
          );
        }

        const resolvedType = retrieved.type as PaymentMethodType;
        await this.paymentsService.resolveAllowedPaymentMethodTypes({
          requestedMethodTypes: [resolvedType],
          currency: dto.currency,
          country: dto.country,
        });

        const linkedCustomerId =
          typeof retrieved.customer === 'string'
            ? retrieved.customer
            : retrieved.customer?.id;

        if (
          linkedCustomerId &&
          linkedCustomerId !== customer.stripeCustomerId
        ) {
          throw new ConflictException(
            'Payment method is already attached to another customer.',
          );
        }

        const alreadyAttachedToSameCustomer =
          linkedCustomerId === customer.stripeCustomerId;

        if (alreadyAttachedToSameCustomer && dto.ifExists === 'error') {
          throw new ConflictException(
            'Payment method is already attached to this customer.',
          );
        }

        const attached = alreadyAttachedToSameCustomer
          ? retrieved
          : await this.paymentsRepository.attachPaymentMethod(
              dto.paymentMethodId,
              customer.stripeCustomerId,
            );

        await this.paymentsRepository.upsertPaymentMethodState(
          attached,
          'attached',
        );

        let defaultSet = false;
        if (dto.setAsDefault) {
          await this.paymentsRepository.setDefaultPaymentMethod(
            customer.stripeCustomerId,
            attached.id,
          );
          defaultSet = true;
        }

        const defaultPaymentMethodId =
          await this.paymentsRepository.getDefaultPaymentMethodId(
            customer.stripeCustomerId,
          );

        await this.paymentsRepository.syncDefaultPaymentMethodFlag({
          stripeCustomerId: customer.stripeCustomerId,
          defaultPaymentMethodId,
        });

        return {
          customerId,
          stripeCustomerId: customer.stripeCustomerId,
          paymentMethodId: attached.id,
          type: attached.type,
          actionTaken: alreadyAttachedToSameCustomer ? 'reused' : 'attached',
          alreadyExisted: alreadyAttachedToSameCustomer,
          defaultSet,
        };
      },
    );
  }

  async addMorePaymentMethodsFlow(
    customerId: string,
    dto: AddMorePaymentMethodsFlowDto,
    idempotencyKey: string,
  ) {
    return this.runIdempotent(
      'payment-methods.flows.add-more',
      idempotencyKey,
      async () => {
        const customer = await this.requireLinkedCustomer(customerId);
        const allowedPaymentMethodTypes =
          await this.paymentsService.resolveAllowedPaymentMethodTypes({
            requestedMethodTypes: dto.paymentMethodTypes,
            currency: dto.currency,
            country: dto.country,
          });

        const [methods, currentDefaultPaymentMethodId] = await Promise.all([
          this.paymentsRepository.listCustomerPaymentMethods({
            stripeCustomerId: customer.stripeCustomerId,
          }),
          this.paymentsRepository.getDefaultPaymentMethodId(
            customer.stripeCustomerId,
          ),
        ]);

        const hasExistingMethods = methods.data.length > 0;
        const setupIntent = await this.paymentsRepository.createSetupIntent({
          stripeCustomerId: customer.stripeCustomerId,
          usage: dto.usage ?? 'off_session',
          paymentMethodTypes: allowedPaymentMethodTypes,
        });

        await this.paymentsRepository.upsertSetupIntentState(setupIntent);

        return {
          customerId,
          stripeCustomerId: customer.stripeCustomerId,
          setupIntentId: setupIntent.id,
          clientSecret: setupIntent.client_secret,
          status: setupIntent.status,
          allowedPaymentMethodTypes,
          hasExistingMethods,
          currentDefaultPaymentMethodId,
          recommendedSetDefault:
            !hasExistingMethods && dto.setAsDefaultWhenFirst !== false,
        };
      },
    );
  }

  async getPaymentMethodFlowSummary(
    customerId: string,
    query: PaymentMethodFlowSummaryDto,
  ) {
    const [customerMethods, enabledMethods] = await Promise.all([
      this.paymentsService.listCustomerPaymentMethods(customerId, {}),
      this.paymentsService.listEnabledPaymentMethods(query),
    ]);

    const canAddMore = enabledMethods.enabledPaymentMethods.length > 0;
    const canSetDefault = customerMethods.paymentMethods.length > 0;
    const canDetach = customerMethods.paymentMethods.length > 0;

    return {
      customerId: customerMethods.customerId,
      stripeCustomerId: customerMethods.stripeCustomerId,
      paymentMethods: customerMethods.paymentMethods,
      defaultPaymentMethodId: customerMethods.defaultPaymentMethodId,
      allowedPaymentMethodTypes: enabledMethods.enabledPaymentMethods,
      actions: {
        canAddMore,
        canSetDefault,
        canDetach,
      },
    };
  }

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
    const scopedKey = buildIdempotencyNamespace(
      operation,
      idempotencyKey || randomUUID(),
    );
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
}
