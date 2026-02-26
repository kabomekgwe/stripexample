import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecordSubscriptionUsageBatchDto } from './dto/record-subscription-usage-batch.dto';
import { RecordMonthlyUsageDto } from './dto/record-monthly-usage.dto';
import { RecordSubscriptionUsageDto } from './dto/record-subscription-usage.dto';
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

  /** Records metered subscription usage directly in Stripe. */
  @Post('usage-subscription')
  @ApiOperation({ summary: 'Record metered subscription usage in Stripe' })
  @ApiOkResponse({ description: 'Stripe usage record result' })
  recordSubscriptionUsage(@Body() dto: RecordSubscriptionUsageDto) {
    return this.usageBillingService.recordSubscriptionUsage(dto);
  }

  /** Records multiple metered subscription usage events in one request. */
  @Post('usage-subscription/batch')
  @ApiOperation({ summary: 'Record usage meters in batch' })
  @ApiOkResponse({ description: 'Batch usage meter result' })
  recordSubscriptionUsageBatch(@Body() dto: RecordSubscriptionUsageBatchDto) {
    return this.usageBillingService.recordSubscriptionUsageBatch(dto);
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
