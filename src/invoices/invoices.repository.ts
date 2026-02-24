import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingInvoices } from '../infra/database/schema';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, id))
      .limit(1);

    return result ?? null;
  }

  async findByTenant(tenantId: string) {
    return this.databaseService.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.tenantId, tenantId))
      .orderBy(desc(billingInvoices.createdAt));
  }

  async findByStripeInvoiceId(stripeInvoiceId: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.stripeInvoiceId, stripeInvoiceId))
      .limit(1);

    return result ?? null;
  }

  async upsertFromStripe(args: {
    tenantId: string;
    stripeInvoiceId: string;
    amountDueCents: number;
    amountPaidCents: number;
    status: string;
    currency: string;
    invoiceUrl: string | null;
  }) {
    const existing = await this.findByStripeInvoiceId(args.stripeInvoiceId);
    if (existing) {
      await this.databaseService.db
        .update(billingInvoices)
        .set({
          amountDueCents: args.amountDueCents,
          amountPaidCents: args.amountPaidCents,
          status: args.status,
          currency: args.currency,
          invoiceUrl: args.invoiceUrl,
          updatedAt: new Date(),
        })
        .where(eq(billingInvoices.id, existing.id));

      return this.findById(existing.id);
    }

    const [created] = await this.databaseService.db
      .insert(billingInvoices)
      .values({
        tenantId: args.tenantId,
        stripeInvoiceId: args.stripeInvoiceId,
        amountDueCents: args.amountDueCents,
        amountPaidCents: args.amountPaidCents,
        status: args.status,
        currency: args.currency,
        invoiceUrl: args.invoiceUrl,
      })
      .returning({ id: billingInvoices.id });

    return this.findById(created.id);
  }

  async updateByStripeInvoiceId(args: {
    stripeInvoiceId: string;
    status: string;
    amountPaidCents: number;
    amountDueCents: number;
  }): Promise<void> {
    await this.databaseService.db
      .update(billingInvoices)
      .set({
        status: args.status,
        amountPaidCents: args.amountPaidCents,
        amountDueCents: args.amountDueCents,
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.stripeInvoiceId, args.stripeInvoiceId));
  }
}
