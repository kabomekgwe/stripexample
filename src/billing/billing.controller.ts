import { Body, Controller, Post } from '@nestjs/common';
import { RecordMonthlyUsageDto } from './dto/record-monthly-usage.dto';
import { UsageBillingService } from './usage-billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly usageBillingService: UsageBillingService) {}

  @Post('usage-monthly')
  recordUsage(@Body() dto: RecordMonthlyUsageDto) {
    return this.usageBillingService.recordMonthlyUsage(dto);
  }

  @Post('usage-monthly/process')
  async processUsageQueue() {
    await this.usageBillingService.runMonthlyBillingJob();
    return { queued: true };
  }
}
