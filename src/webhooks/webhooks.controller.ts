import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  @HttpCode(200)
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
