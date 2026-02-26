import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsRepository } from './refunds.repository';
import { RefundsService } from './refunds.service';

@Module({
  controllers: [RefundsController],
  providers: [RefundsRepository, RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
