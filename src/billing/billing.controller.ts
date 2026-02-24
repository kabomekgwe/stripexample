import { Body, Controller, Post } from '@nestjs/common';
import { RecordMonthlyUsageDto } from './dto/record-monthly-usage.dto';
import { UsageBillingService } from './usage-billing.service';

@Controller('billing')
export class BillingController {
  /** Creates the billing controller with usage billing endpoints. */
  constructor(private readonly usageBillingService: UsageBillingService) {}

  /** Records monthly usage values that become billable amount in DB. */
  @Post('usage-monthly')
  recordUsage(@Body() dto: RecordMonthlyUsageDto) {
    return this.usageBillingService.recordMonthlyUsage(dto);
  }

  /** Triggers processing of queued monthly usage outbox events. */
  @Post('usage-monthly/process')
  async processUsageQueue() {
    await this.usageBillingService.runMonthlyBillingJob();
    return { queued: true };
  }
}
