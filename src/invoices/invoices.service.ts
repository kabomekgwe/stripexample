import { Injectable, NotFoundException } from '@nestjs/common';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  /** Creates the invoices service with DB and Stripe dependencies. */
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly stripeClientService: StripeClientService,
  ) {}

  /** Returns every invoice row stored for this company. */
  async listForCompany() {
    return this.invoicesRepository.findAll();
  }

  /** Returns one invoice by internal id or throws if missing. */
  async getById(id: string) {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return invoice;
  }

  /** Fetches a Stripe invoice and upserts it into the local DB. */
  async syncFromStripe(stripeInvoiceId: string) {
    const stripeInvoice =
      await this.stripeClientService.client.invoices.retrieve(stripeInvoiceId);

    return this.invoicesRepository.upsertFromStripe({
      stripeInvoiceId: stripeInvoice.id,
      amountDueCents: stripeInvoice.amount_due,
      amountPaidCents: stripeInvoice.amount_paid,
      status: stripeInvoice.status ?? 'draft',
      currency: stripeInvoice.currency,
      invoiceUrl: stripeInvoice.hosted_invoice_url ?? null,
    });
  }
}
