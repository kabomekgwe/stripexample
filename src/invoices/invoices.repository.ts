import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../infra/database/database.service';
import { billingInvoices } from '../infra/database/schema';

@Injectable()
export class InvoicesRepository {
  /** Creates the invoices repository with database access. */
  constructor(private readonly databaseService: DatabaseService) {}

  /** Finds an invoice by internal id. */
  async findById(id: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, id))
      .limit(1);

    return result ?? null;
  }

  /** Returns all invoices ordered by newest first. */
  async findAll() {
    return this.databaseService.db
      .select()
      .from(billingInvoices)
      .orderBy(desc(billingInvoices.createdAt));
  }

  /** Finds an invoice by Stripe invoice id. */
  async findByStripeInvoiceId(stripeInvoiceId: string) {
    const [result] = await this.databaseService.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.stripeInvoiceId, stripeInvoiceId))
      .limit(1);

    return result ?? null;
  }

  /** Upserts invoice fields sourced from Stripe into local DB. */
  async upsertFromStripe(args: {
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

  /** Updates invoice status and amounts by Stripe invoice id. */
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
