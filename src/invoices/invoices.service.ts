import { Injectable, NotFoundException } from '@nestjs/common';
import { StripeClientService } from '../stripe-client/stripe-client.service';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly stripeClientService: StripeClientService,
  ) {}

  async listCurrentTenant() {
    return this.invoicesRepository.findAll();
  }

  async getById(id: string) {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return invoice;
  }

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
