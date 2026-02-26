import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CustomerCacheService } from '../customer-cache/customer-cache.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@ApiTags('Customers')
export class CustomersController {
  /** Creates the customers controller with customer command handlers. */
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerCacheService: CustomerCacheService,
  ) {}

  /** Returns customer list from Redis snapshot cache. */
  @Get()
  @ApiOperation({ summary: 'List customers (Redis-backed)' })
  @ApiOkResponse({ description: 'Cached customer list' })
  list() {
    return this.customerCacheService.getCustomerListFromCache();
  }

  /** Triggers an on-demand Redis customer snapshot sync. */
  @Post('cache/sync')
  @ApiOperation({ summary: 'Sync customer list cache now' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Cache sync accepted or reused result' })
  syncCache(@Headers('idempotency-key') idempotencyKey?: string) {
    return this.customerCacheService.syncCustomerListOnDemand(
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Creates a customer in DB and synchronizes it to Stripe. */
  @Post()
  @ApiOperation({ summary: 'Create customer' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Customer created or reused' })
  create(
    @Body() dto: CreateCustomerDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.customersService.create(dto, idempotencyKey ?? randomUUID());
  }

  /** Returns a customer by internal id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiOkResponse({ description: 'Customer record' })
  getById(@Param('id') id: string) {
    return this.customersService.getById(id);
  }
}
