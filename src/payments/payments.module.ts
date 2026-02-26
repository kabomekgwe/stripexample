import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { PaymentMethodPoliciesRepository } from './payment-method-policies.repository';
import { PaymentMethodPoliciesService } from './payment-method-policies.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [CustomersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentMethodPoliciesRepository,
    PaymentMethodPoliciesService,
    PaymentsRepository,
    PaymentsService,
  ],
  exports: [PaymentMethodPoliciesService, PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
