import { Controller, Get, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  listForCompany() {
    return this.invoicesService.listCurrentTenant();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.invoicesService.getById(id);
  }
}
