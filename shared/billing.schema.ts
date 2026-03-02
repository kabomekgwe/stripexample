import { z } from 'zod';

export const UsageRecordSchema = z.object({
    id: z.string(),
    billingPeriod: z.string(),
    usageQuantity: z.number(),
    unitPriceCents: z.number().int(),
    finalized: z.boolean(),
    stripeInvoiceItemId: z.string().nullable(),
    createdAt: z.string(),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const RecordUsageSchema = z.object({
    stripeCustomerId: z.string(),
    billingPeriod: z.string(),
    usageQuantity: z.number().positive(),
    unitPriceCents: z.number().int().positive(),
});

export type RecordUsage = z.infer<typeof RecordUsageSchema>;

export const InvoiceSchema = z.object({
    id: z.string(),
    amountDueCents: z.number().int(),
    amountPaidCents: z.number().int(),
    currency: z.string().length(3),
    status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
    hostedInvoiceUrl: z.string().url().nullable(),
    createdAt: z.string(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

export const RefundSchema = z.object({
    id: z.string(),
    paymentIntentId: z.string(),
    amountCents: z.number().int().positive(),
    status: z.string(),
    createdAt: z.string(),
});

export type Refund = z.infer<typeof RefundSchema>;

export const CreateRefundSchema = z.object({
    paymentIntentId: z.string(),
    amountCents: z.number().int().positive().optional(),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

export type CreateRefund = z.infer<typeof CreateRefundSchema>;
