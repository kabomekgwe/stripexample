import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecordMonthlyUsageDto } from './dto/record-monthly-usage.dto';
import { UsageBillingService } from './usage-billing.service';

@Controller('billing')
@ApiTags('Billing')
export class BillingController {
  /** Creates the billing controller with usage billing endpoints. */
  constructor(private readonly usageBillingService: UsageBillingService) {}

  /** Records monthly usage values that become billable amount in DB. */
  @Post('usage-monthly')
  @ApiOperation({ summary: 'Record monthly usage' })
  @ApiOkResponse({ description: 'Monthly usage row created or updated' })
  recordUsage(@Body() dto: RecordMonthlyUsageDto) {
    return this.usageBillingService.recordMonthlyUsage(dto);
  }

  /** Triggers processing of queued monthly usage outbox events. */
  @Post('usage-monthly/process')
  @ApiOperation({ summary: 'Process monthly usage queue' })
  @ApiOkResponse({ description: 'Queue processing triggered' })
  async processUsageQueue() {
    await this.usageBillingService.runMonthlyBillingJob();
    return { queued: true };
  }
}
