import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdempotencyService } from '../infra/idempotency/idempotency.service';
import { buildIdempotencyNamespace } from '../payments/utils/account.util';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersRepository } from './customers.repository';
import { CustomerCacheService } from '../customer-cache/customer-cache.service';

@Injectable()
export class CustomersService {
  /** Creates the customers service with DB, idempotency, and Stripe dependencies. */
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly idempotencyService: IdempotencyService,
    private readonly stripeClientService: StripeClientService,
    private readonly customerCacheService: CustomerCacheService,
  ) { }

  /** Creates or reuses a customer record, then synchronizes it to Stripe safely. */
  async create(
    dto: CreateCustomerDto,
    idempotencyKey: string,
  ): Promise<{
    id: string;
    stripeCustomerId: string | null;
    syncStatus: string;
  }> {
    const scopedKey = buildIdempotencyNamespace(
      'customers.create',
      idempotencyKey,
    );
    const cached = await this.idempotencyService.getStoredResult<{
      id: string;
      stripeCustomerId: string | null;
      syncStatus: string;
    }>(scopedKey);
    if (cached) {
      return cached;
    }

    const acquired = await this.idempotencyService.start(scopedKey);
    if (!acquired) {
      throw new ConflictException('Request is already being processed.');
    }

    try {
      const existing = await this.customersRepository.findByEmail(dto.email);
      if (existing?.stripeCustomerId) {
        const response = {
          id: existing.id,
          stripeCustomerId: existing.stripeCustomerId,
          syncStatus: 'synced',
        };
        await this.idempotencyService.complete(scopedKey, response);
        return response;
      }

      const internal =
        existing ??
        (await this.customersRepository.create({
          userId: dto.userId,
          email: dto.email,
        }));

      try {
        const stripeCustomer =
          await this.stripeClientService.client.customers.create({
            email: dto.email,
            name: dto.name,
            metadata: {
              internalCustomerId: internal.id,
            },
          });

        await this.customersRepository.attachStripeCustomerId({
          customerId: internal.id,
          stripeCustomerId: stripeCustomer.id,
        });
      } catch {
        await this.customersRepository.markSyncError(internal.id);
        throw new ServiceUnavailableException(
          'Customer stored in DB, Stripe sync failed and can be retried.',
        );
      }

      const result = {
        id: internal.id,
        stripeCustomerId:
          (await this.customersRepository.findById(internal.id))
            ?.stripeCustomerId ?? null,
        syncStatus: 'synced',
      };
      await this.idempotencyService.complete(scopedKey, result);

      // Trigger cache sync so the UI is updated immediately
      await this.customerCacheService.syncCustomerListToRedis('manual');

      return result;
    } catch (error) {
      await this.idempotencyService.clear(scopedKey);
      throw error;
    }
  }

  /** Returns a customer row by internal id. */
  async getById(id: string) {
    return this.customersRepository.findById(id);
  }
}
