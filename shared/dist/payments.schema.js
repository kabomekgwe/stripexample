"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetachPaymentMethodSchema = exports.SetDefaultPaymentMethodSchema = exports.ConfirmSetupIntentSchema = exports.CreateSetupIntentSchema = exports.AttachPaymentMethodSchema = exports.PaymentMethodSchema = exports.CreatePaymentIntentSchema = exports.PaymentIntentSchema = exports.PAYMENT_METHOD_TYPES = void 0;
const zod_1 = require("zod");
exports.PAYMENT_METHOD_TYPES = [
    'acss_debit',
    'affirm',
    'afterpay_clearpay',
    'alipay',
    'au_becs_debit',
    'bacs_debit',
    'bancontact',
    'blik',
    'boleto',
    'card',
    'cashapp',
    'customer_balance',
    'eps',
    'fpx',
    'giropay',
    'grabpay',
    'ideal',
    'klarna',
    'konbini',
    'link',
    'oxxo',
    'p24',
    'paynow',
    'paypal',
    'promptpay',
    'sepa_debit',
    'sofort',
    'us_bank_account',
    'wechat_pay',
    'zip',
];
exports.PaymentIntentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    amountCents: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().length(3),
    status: zod_1.z.string(),
    clientSecret: zod_1.z.string().nullable(),
    customerId: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    createdAt: zod_1.z.string(),
});
exports.CreatePaymentIntentSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    amountCents: zod_1.z.number().int().min(50),
    currency: zod_1.z.string().length(3).default('gbp'),
    description: zod_1.z.string().optional(),
});
exports.PaymentMethodSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    card: zod_1.z.object({
        brand: zod_1.z.string(),
        last4: zod_1.z.string(),
        expMonth: zod_1.z.number(),
        expYear: zod_1.z.number(),
    }).optional(),
});
exports.AttachPaymentMethodSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    paymentMethodId: zod_1.z.string(),
    setAsDefault: zod_1.z.boolean().optional(),
});
exports.CreateSetupIntentSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    usage: zod_1.z.enum(['off_session', 'on_session']).optional(),
    paymentMethodTypes: zod_1.z.array(zod_1.z.enum(exports.PAYMENT_METHOD_TYPES)).nonempty().optional(),
    currency: zod_1.z.string().length(3).optional(),
    country: zod_1.z.string().length(2).optional(),
});
exports.ConfirmSetupIntentSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    setupIntentId: zod_1.z.string(),
    paymentMethodId: zod_1.z.string(),
    setAsDefaultOnSuccess: zod_1.z.boolean().optional(),
});
exports.SetDefaultPaymentMethodSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    paymentMethodId: zod_1.z.string(),
});
exports.DetachPaymentMethodSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    paymentMethodId: zod_1.z.string(),
});
//# sourceMappingURL=payments.schema.js.map