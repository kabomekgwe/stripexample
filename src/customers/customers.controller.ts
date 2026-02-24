import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @Body() dto: CreateCustomerDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.customersService.create(dto, idempotencyKey ?? randomUUID());
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }
}
