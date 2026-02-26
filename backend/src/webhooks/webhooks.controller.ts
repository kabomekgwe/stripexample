import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
@ApiTags('Webhooks')
export class WebhooksController {
  /** Creates the webhook controller with Stripe webhook ingestion handlers. */
  constructor(private readonly webhooksService: WebhooksService) {}

  /** Verifies Stripe signature and dispatches webhook processing. */
  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stripe webhook callback' })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Stripe signature header used to verify webhook authenticity',
  })
  @ApiOkResponse({
    description: 'Webhook accepted',
    schema: { example: { received: true } },
  })
  async handleStripeWebhook(
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    if (!request.rawBody || !stripeSignature) {
      throw new BadRequestException('Missing raw body or stripe signature.');
    }

    const event = this.webhooksService.verifyAndBuildEvent(
      request.rawBody,
      stripeSignature,
    );
    await this.webhooksService.process(event);

    return { received: true };
  }
}
