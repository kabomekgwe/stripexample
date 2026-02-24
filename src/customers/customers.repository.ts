import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingCustomers } from '../infra/database/schema';

@Injectable()
export class CustomersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(args: {
    userId?: string;
    email: string;
  }): Promise<{ id: string }> {
    const [result] = await this.databaseService.db
      .insert(billingCustomers)
      .values({
        userId: args.userId,
        email: args.email,
      })
      .returning({ id: billingCustomers.id });

    return result;
  }

  async findByEmail(
    email: string,
  ): Promise<{ id: string; stripeCustomerId: string | null } | null> {
    const [result] = await this.databaseService.db
      .select({
        id: billingCustomers.id,
        stripeCustomerId: billingCustomers.stripeCustomerId,
      })
      .from(billingCustomers)
      .where(and(eq(billingCustomers.email, email)))
      .limit(1);

    return result ?? null;
  }

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.id, id))
      .limit(1);

    return result ?? null;
  }

  async attachStripeCustomerId(args: {
    customerId: string;
    stripeCustomerId: string;
  }): Promise<void> {
    await this.databaseService.db
      .update(billingCustomers)
      .set({
        stripeCustomerId: args.stripeCustomerId,
        syncStatus: 'synced',
        updatedAt: new Date(),
      })
      .where(eq(billingCustomers.id, args.customerId));
  }

  async markSyncError(customerId: string): Promise<void> {
    await this.databaseService.db
      .update(billingCustomers)
      .set({
        syncStatus: 'sync_failed',
        updatedAt: new Date(),
      })
      .where(eq(billingCustomers.id, customerId));
  }
}
