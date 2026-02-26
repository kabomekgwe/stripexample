import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { InvoicesService } from '../../invoices/invoices.service';
import { DatabaseService } from '../../infra/database/database.service';
import {
  billingCheckoutSessions,
  billingPaymentIntents,
  billingRefunds,
} from '../../infra/database/schema';
import { RefundsService } from '../../refunds/refunds.service';
import type { CreateRefundDto } from '../../refunds/dto/create-refund.dto';

@Injectable()
export class BillingHistoryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly invoicesService: InvoicesService,
    private readonly refundsService: RefundsService,
  ) {}

  async getTimeline(customerId: string) {
    const [paymentIntents, checkoutSessions] = await Promise.all([
      this.databaseService.db
        .select()
        .from(billingPaymentIntents)
        .where(eq(billingPaymentIntents.customerId, customerId))
        .orderBy(desc(billingPaymentIntents.createdAt)),
      this.databaseService.db
        .select()
        .from(billingCheckoutSessions)
        .where(eq(billingCheckoutSessions.customerId, customerId))
        .orderBy(desc(billingCheckoutSessions.createdAt)),
    ]);

    const paymentIntentIds = paymentIntents.map((item) => item.id);

    const refunds = await (paymentIntentIds.length
      ? this.databaseService.db
          .select()
          .from(billingRefunds)
          .where(inArray(billingRefunds.paymentIntentId, paymentIntentIds))
          .orderBy(desc(billingRefunds.createdAt))
      : []);

    const invoices = await this.invoicesService.listForCompany();

    return {
      customerId,
      paymentIntents,
      refunds,
      invoices,
      checkoutSessions,
    };
  }

  async getInvoice(_customerId: string, invoiceId: string) {
    return this.invoicesService.getById(invoiceId);
  }

  async createRefundForCustomer(
    customerId: string,
    dto: CreateRefundDto,
    idempotencyKey: string,
  ) {
    const [paymentIntent] = await this.databaseService.db
      .select({ customerId: billingPaymentIntents.customerId })
      .from(billingPaymentIntents)
      .where(eq(billingPaymentIntents.id, dto.paymentIntentId))
      .limit(1);

    if (!paymentIntent || paymentIntent.customerId !== customerId) {
      throw new NotFoundException('Payment intent not found for customer.');
    }

    return this.refundsService.create(dto, idempotencyKey);
  }
}
