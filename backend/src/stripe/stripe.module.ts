import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { CustomersModule } from '../customers/customers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentIntentsModule } from '../payment-intents/payment-intents.module';
import { PaymentsModule } from '../payments/payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StripeClientModule } from '../stripe-client/stripe-client.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BillingHistoryController } from './controllers/billing-history.controller';
import { CheckoutFlowsController } from './controllers/checkout-flows.controller';
import { PaymentMethodFlowsController } from './controllers/payment-method-flows.controller';
import { PaymentMethodManagementController } from './controllers/payment-method-management.controller';
import { PaymentRecoveryController } from './controllers/payment-recovery.controller';
import { BillingHistoryService } from './services/billing-history.service';
import { CheckoutFlowsService } from './services/checkout-flows.service';
import { PaymentMethodManagementService } from './services/payment-method-management.service';
import { PaymentMethodFlowsService } from './services/payment-method-flows.service';
import { PaymentRecoveryService } from './services/payment-recovery.service';

@Module({
  imports: [
    StripeClientModule,
    CustomersModule,
    PaymentsModule,
    PaymentIntentsModule,
    CheckoutModule,
    InvoicesModule,
    RefundsModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [
    PaymentMethodFlowsController,
    PaymentMethodManagementController,
    CheckoutFlowsController,
    PaymentRecoveryController,
    BillingHistoryController,
  ],
  providers: [
    PaymentMethodFlowsService,
    PaymentMethodManagementService,
    CheckoutFlowsService,
    PaymentRecoveryService,
    BillingHistoryService,
  ],
  exports: [
    PaymentMethodFlowsService,
    PaymentMethodManagementService,
    CheckoutFlowsService,
    PaymentRecoveryService,
    BillingHistoryService,
  ],
})
export class StripeModule {}
