import { Controller, Get, Param, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  /** Creates the invoices controller with billing query handlers. */
  constructor(private readonly invoicesService: InvoicesService) {}

  /** Returns all invoices for this company. */
  @Get()
  listForCompany() {
    return this.invoicesService.listForCompany();
  }

  /** Returns a single internal invoice record by id. */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.invoicesService.getById(id);
  }

  /** Pulls the latest invoice state from Stripe and writes it to the DB. */
  @Post('sync/:stripeInvoiceId')
  syncFromStripe(@Param('stripeInvoiceId') stripeInvoiceId: string) {
    return this.invoicesService.syncFromStripe(stripeInvoiceId);
  }
}
