import { Module } from '@nestjs/common';
import { CustomerCacheModule } from '../customer-cache/customer-cache.module';
import { CustomersController } from './customers.controller';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';

@Module({
  imports: [CustomerCacheModule],
  controllers: [CustomersController],
  providers: [CustomersRepository, CustomersService],
  exports: [CustomersRepository, CustomersService],
})
export class CustomersModule {}
