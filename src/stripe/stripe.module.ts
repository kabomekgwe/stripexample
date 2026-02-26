import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { CustomersModule } from '../customers/customers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentIntentsModule } from '../payment-intents/payment-intents.module';
import { PaymentsModule } from '../payments/payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StripeClientModule } from '../stripe-client/stripe-client.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentMethodFlowsController } from './controllers/payment-method-flows.controller';
import { PaymentMethodFlowsService } from './services/payment-method-flows.service';

@Module({
  imports: [
    StripeClientModule,
    CustomersModule,
    PaymentsModule,
    PaymentIntentsModule,
    CheckoutModule,
    SubscriptionsModule,
    InvoicesModule,
    RefundsModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [PaymentMethodFlowsController],
  providers: [PaymentMethodFlowsService],
  exports: [PaymentMethodFlowsService],
})
export class StripeModule {}
