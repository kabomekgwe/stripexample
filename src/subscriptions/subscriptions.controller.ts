import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@ApiTags('Subscriptions')
export class SubscriptionsController {
  /** Creates the subscriptions controller with lifecycle handlers. */
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Creates a subscription and links the Stripe subscription id. */
  @Post()
  @ApiOperation({ summary: 'Create subscription' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Subscription created or reused' })
  create(
    @Body() dto: CreateSubscriptionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionsService.create(
      dto,
      idempotencyKey ?? randomUUID(),
    );
  }

  /** Updates a subscription plan or Stripe price mapping. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Subscription updated' })
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

  /** Cancels a subscription internally and then in Stripe. */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiOkResponse({ description: 'Subscription cancelled' })
  cancel(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.subscriptionsService.cancel(id, idempotencyKey ?? randomUUID());
  }

  /** Returns a subscription by internal id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by id' })
  @ApiOkResponse({ description: 'Subscription record' })
  getById(@Param('id') id: string) {
    return this.subscriptionsService.getById(id);
  }
}
