import { z } from 'zod';
export declare const UsageRecordSchema: z.ZodObject<{
    id: z.ZodString;
    billingPeriod: z.ZodString;
    usageQuantity: z.ZodNumber;
    unitPriceCents: z.ZodNumber;
    finalized: z.ZodBoolean;
    stripeInvoiceItemId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
    finalized: boolean;
    stripeInvoiceItemId: string | null;
    createdAt: string;
}, {
    id: string;
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
    finalized: boolean;
    stripeInvoiceItemId: string | null;
    createdAt: string;
}>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export declare const RecordUsageSchema: z.ZodObject<{
    stripeCustomerId: z.ZodString;
    billingPeriod: z.ZodString;
    usageQuantity: z.ZodNumber;
    unitPriceCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
    stripeCustomerId: string;
}, {
    billingPeriod: string;
    usageQuantity: number;
    unitPriceCents: number;
    stripeCustomerId: string;
}>;
export type RecordUsage = z.infer<typeof RecordUsageSchema>;
export declare const InvoiceSchema: z.ZodObject<{
    id: z.ZodString;
    amountDueCents: z.ZodNumber;
    amountPaidCents: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodEnum<["draft", "open", "paid", "uncollectible", "void"]>;
    hostedInvoiceUrl: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    status: "void" | "draft" | "open" | "paid" | "uncollectible";
    amountDueCents: number;
    amountPaidCents: number;
    currency: string;
    hostedInvoiceUrl: string | null;
}, {
    id: string;
    createdAt: string;
    status: "void" | "draft" | "open" | "paid" | "uncollectible";
    amountDueCents: number;
    amountPaidCents: number;
    currency: string;
    hostedInvoiceUrl: string | null;
}>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export declare const RefundSchema: z.ZodObject<{
    id: z.ZodString;
    paymentIntentId: z.ZodString;
    amountCents: z.ZodNumber;
    status: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    status: string;
    paymentIntentId: string;
    amountCents: number;
}, {
    id: string;
    createdAt: string;
    status: string;
    paymentIntentId: string;
    amountCents: number;
}>;
export type Refund = z.infer<typeof RefundSchema>;
export declare const CreateRefundSchema: z.ZodObject<{
    paymentIntentId: z.ZodString;
    amountCents: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodEnum<["duplicate", "fraudulent", "requested_by_customer"]>>;
}, "strip", z.ZodTypeAny, {
    paymentIntentId: string;
    amountCents?: number | undefined;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer" | undefined;
}, {
    paymentIntentId: string;
    amountCents?: number | undefined;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer" | undefined;
}>;
export type CreateRefund = z.infer<typeof CreateRefundSchema>;
