import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@ApiTags('Invoices')
export class InvoicesController {
  /** Creates the invoices controller with billing query handlers. */
  constructor(private readonly invoicesService: InvoicesService) {}

  /** Returns all invoices for this company. */
  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiOkResponse({ description: 'Invoice list' })
  listForCompany() {
    return this.invoicesService.listForCompany();
  }

  /** Returns a single internal invoice record by id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by id' })
  @ApiOkResponse({ description: 'Invoice record' })
  getById(@Param('id') id: string) {
    return this.invoicesService.getById(id);
  }

  /** Pulls the latest invoice state from Stripe and writes it to the DB. */
  @Post('sync/:stripeInvoiceId')
  @ApiOperation({ summary: 'Sync invoice from Stripe' })
  @ApiOkResponse({ description: 'Synced invoice record' })
  syncFromStripe(@Param('stripeInvoiceId') stripeInvoiceId: string) {
    return this.invoicesService.syncFromStripe(stripeInvoiceId);
  }
}
