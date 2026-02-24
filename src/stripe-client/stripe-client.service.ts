import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClientService {
  readonly client: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.client = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: this.configService.getOrThrow<string>(
          'STRIPE_API_VERSION',
        ) as Stripe.LatestApiVersion,
      },
    );
  }
}
