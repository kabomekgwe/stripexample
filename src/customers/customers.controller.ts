import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  /** Creates the customers controller with customer command handlers. */
  constructor(private readonly customersService: CustomersService) {}

  /** Creates a customer in DB and synchronizes it to Stripe. */
  @Post()
  create(
    @Body() dto: CreateCustomerDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.customersService.create(dto, idempotencyKey ?? randomUUID());
  }

  /** Returns a customer by internal id. */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }
}
