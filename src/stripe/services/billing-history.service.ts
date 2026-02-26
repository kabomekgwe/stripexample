import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { InvoicesService } from '../../invoices/invoices.service';
import { DatabaseService } from '../../infra/database/database.service';
import {
  billingCheckoutSessions,
  billingInvoices,
  billingPaymentIntents,
  billingRefunds,
  billingSubscriptions,
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
    const [paymentIntents, subscriptions, checkoutSessions] = await Promise.all(
      [
        this.databaseService.db
          .select()
          .from(billingPaymentIntents)
          .where(eq(billingPaymentIntents.customerId, customerId))
          .orderBy(desc(billingPaymentIntents.createdAt)),
        this.databaseService.db
          .select()
          .from(billingSubscriptions)
          .where(eq(billingSubscriptions.customerId, customerId))
          .orderBy(desc(billingSubscriptions.createdAt)),
        this.databaseService.db
          .select()
          .from(billingCheckoutSessions)
          .where(eq(billingCheckoutSessions.customerId, customerId))
          .orderBy(desc(billingCheckoutSessions.createdAt)),
      ],
    );

    const paymentIntentIds = paymentIntents.map((item) => item.id);
    const subscriptionIds = subscriptions.map((item) => item.id);

    const [refunds, invoices] = await Promise.all([
      paymentIntentIds.length
        ? this.databaseService.db
            .select()
            .from(billingRefunds)
            .where(inArray(billingRefunds.paymentIntentId, paymentIntentIds))
            .orderBy(desc(billingRefunds.createdAt))
        : [],
      subscriptionIds.length
        ? this.databaseService.db
            .select()
            .from(billingInvoices)
            .where(inArray(billingInvoices.subscriptionId, subscriptionIds))
            .orderBy(desc(billingInvoices.createdAt))
        : [],
    ]);

    return {
      customerId,
      paymentIntents,
      refunds,
      subscriptions,
      invoices,
      checkoutSessions,
    };
  }

  async getInvoice(customerId: string, invoiceId: string) {
    const invoice = await this.invoicesService.getById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (!invoice.subscriptionId) {
      return invoice;
    }

    const [subscription] = await this.databaseService.db
      .select({ customerId: billingSubscriptions.customerId })
      .from(billingSubscriptions)
      .where(
        and(
          eq(billingSubscriptions.id, invoice.subscriptionId),
          eq(billingSubscriptions.customerId, customerId),
        ),
      )
      .limit(1);

    if (!subscription) {
      throw new NotFoundException('Invoice not found for customer.');
    }

    return invoice;
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
