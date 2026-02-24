import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  listByTenant(@Query('tenantId') tenantId: string) {
    return this.invoicesService.listByTenant(tenantId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.invoicesService.getById(id);
  }
}
