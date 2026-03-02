import { z } from 'zod';

export const PAYMENT_METHOD_TYPES = [
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
] as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const PaymentIntentSchema = z.object({
    id: z.string(),
    amountCents: z.number().int().positive(),
    currency: z.string().length(3),
    status: z.string(),
    clientSecret: z.string().nullable(),
    customerId: z.string(),
    description: z.string().optional(),
    createdAt: z.string(),
});

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export const CreatePaymentIntentSchema = z.object({
    customerId: z.string(),
    amountCents: z.number().int().min(50), // Minimum 50 cents for Stripe
    currency: z.string().length(3).default('gbp'),
    description: z.string().optional(),
});

export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>;

export const PaymentMethodSchema = z.object({
    id: z.string(),
    type: z.string(),
    card: z.object({
        brand: z.string(),
        last4: z.string(),
        expMonth: z.number(),
        expYear: z.number(),
    }).optional(),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const AttachPaymentMethodSchema = z.object({
    customerId: z.string(),
    paymentMethodId: z.string(),
    setAsDefault: z.boolean().optional(),
});

export type AttachPaymentMethod = z.infer<typeof AttachPaymentMethodSchema>;

export const CreateSetupIntentSchema = z.object({
    customerId: z.string(),
    usage: z.enum(['off_session', 'on_session']).optional(),
    paymentMethodTypes: z.array(z.enum(PAYMENT_METHOD_TYPES)).nonempty().optional(),
    currency: z.string().length(3).optional(),
    country: z.string().length(2).optional(),
});

export type CreateSetupIntent = z.infer<typeof CreateSetupIntentSchema>;

export const ConfirmSetupIntentSchema = z.object({
    customerId: z.string(),
    setupIntentId: z.string(),
    paymentMethodId: z.string(),
    setAsDefaultOnSuccess: z.boolean().optional(),
});

export type ConfirmSetupIntent = z.infer<typeof ConfirmSetupIntentSchema>;

export const SetDefaultPaymentMethodSchema = z.object({
    customerId: z.string(),
    paymentMethodId: z.string(),
});

export type SetDefaultPaymentMethod = z.infer<typeof SetDefaultPaymentMethodSchema>;

export const DetachPaymentMethodSchema = z.object({
    customerId: z.string(),
    paymentMethodId: z.string(),
});

export type DetachPaymentMethod = z.infer<typeof DetachPaymentMethodSchema>;
