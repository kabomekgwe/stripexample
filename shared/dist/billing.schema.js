"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRefundSchema = exports.RefundSchema = exports.InvoiceSchema = exports.RecordUsageSchema = exports.UsageRecordSchema = void 0;
const zod_1 = require("zod");
exports.UsageRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    billingPeriod: zod_1.z.string(),
    usageQuantity: zod_1.z.number(),
    unitPriceCents: zod_1.z.number().int(),
    finalized: zod_1.z.boolean(),
    stripeInvoiceItemId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string(),
});
exports.RecordUsageSchema = zod_1.z.object({
    stripeCustomerId: zod_1.z.string(),
    billingPeriod: zod_1.z.string(),
    usageQuantity: zod_1.z.number().positive(),
    unitPriceCents: zod_1.z.number().int().positive(),
});
exports.InvoiceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    amountDueCents: zod_1.z.number().int(),
    amountPaidCents: zod_1.z.number().int(),
    currency: zod_1.z.string().length(3),
    status: zod_1.z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']),
    hostedInvoiceUrl: zod_1.z.string().url().nullable(),
    createdAt: zod_1.z.string(),
});
exports.RefundSchema = zod_1.z.object({
    id: zod_1.z.string(),
    paymentIntentId: zod_1.z.string(),
    amountCents: zod_1.z.number().int().positive(),
    status: zod_1.z.string(),
    createdAt: zod_1.z.string(),
});
exports.CreateRefundSchema = zod_1.z.object({
    paymentIntentId: zod_1.z.string(),
    amountCents: zod_1.z.number().int().positive().optional(),
    reason: zod_1.z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});
//# sourceMappingURL=billing.schema.js.map