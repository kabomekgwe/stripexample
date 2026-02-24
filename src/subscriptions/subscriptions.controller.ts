import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(
    @Body() dto: CreateSubscriptionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionsService.create(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionsService.update(
      id,
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionsService.cancel(id, idempotencyKey ?? randomUUID());
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.subscriptionsService.getById(id);
  }
}
