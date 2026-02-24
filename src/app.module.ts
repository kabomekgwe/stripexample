import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidation } from './config/env.validation';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { IdempotencyModule } from './infra/idempotency/idempotency.module';
import { StripeClientModule } from './stripe-client/stripe-client.module';
import { HealthController } from './health.controller';
import { PaymentsModule } from './payments/payments.module';
import { CustomersModule } from './customers/customers.module';
import { PaymentIntentsModule } from './payment-intents/payment-intents.module';
import { CheckoutModule } from './checkout/checkout.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { RefundsModule } from './refunds/refunds.module';
import { BillingModule } from './billing/billing.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    IdempotencyModule,
    StripeClientModule,
    PaymentsModule,
    CustomersModule,
    PaymentIntentsModule,
    CheckoutModule,
    SubscriptionsModule,
    InvoicesModule,
    RefundsModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
