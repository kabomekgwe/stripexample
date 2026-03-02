import { z } from 'zod';
export declare const PAYMENT_METHOD_TYPES: readonly ["acss_debit", "affirm", "afterpay_clearpay", "alipay", "au_becs_debit", "bacs_debit", "bancontact", "blik", "boleto", "card", "cashapp", "customer_balance", "eps", "fpx", "giropay", "grabpay", "ideal", "klarna", "konbini", "link", "oxxo", "p24", "paynow", "paypal", "promptpay", "sepa_debit", "sofort", "us_bank_account", "wechat_pay", "zip"];
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];
export declare const PaymentIntentSchema: z.ZodObject<{
    id: z.ZodString;
    amountCents: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodString;
    clientSecret: z.ZodNullable<z.ZodString>;
    customerId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    status: string;
    currency: string;
    amountCents: number;
    clientSecret: string | null;
    customerId: string;
    description?: string | undefined;
}, {
    id: string;
    createdAt: string;
    status: string;
    currency: string;
    amountCents: number;
    clientSecret: string | null;
    customerId: string;
    description?: string | undefined;
}>;
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export declare const CreatePaymentIntentSchema: z.ZodObject<{
    customerId: z.ZodString;
    amountCents: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    amountCents: number;
    customerId: string;
    description?: string | undefined;
}, {
    amountCents: number;
    customerId: string;
    currency?: string | undefined;
    description?: string | undefined;
}>;
export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>;
export declare const PaymentMethodSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    card: z.ZodOptional<z.ZodObject<{
        brand: z.ZodString;
        last4: z.ZodString;
        expMonth: z.ZodNumber;
        expYear: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    }, {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: string;
    card?: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    } | undefined;
}, {
    id: string;
    type: string;
    card?: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    } | undefined;
}>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export declare const AttachPaymentMethodSchema: z.ZodObject<{
    customerId: z.ZodString;
    paymentMethodId: z.ZodString;
    setAsDefault: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    paymentMethodId: string;
    setAsDefault?: boolean | undefined;
}, {
    customerId: string;
    paymentMethodId: string;
    setAsDefault?: boolean | undefined;
}>;
export type AttachPaymentMethod = z.infer<typeof AttachPaymentMethodSchema>;
export declare const CreateSetupIntentSchema: z.ZodObject<{
    customerId: z.ZodString;
    usage: z.ZodOptional<z.ZodEnum<["off_session", "on_session"]>>;
    paymentMethodTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["acss_debit", "affirm", "afterpay_clearpay", "alipay", "au_becs_debit", "bacs_debit", "bancontact", "blik", "boleto", "card", "cashapp", "customer_balance", "eps", "fpx", "giropay", "grabpay", "ideal", "klarna", "konbini", "link", "oxxo", "p24", "paynow", "paypal", "promptpay", "sepa_debit", "sofort", "us_bank_account", "wechat_pay", "zip"]>, "atleastone">>;
    currency: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    currency?: string | undefined;
    usage?: "off_session" | "on_session" | undefined;
    paymentMethodTypes?: ["acss_debit" | "affirm" | "afterpay_clearpay" | "alipay" | "au_becs_debit" | "bacs_debit" | "bancontact" | "blik" | "boleto" | "card" | "cashapp" | "customer_balance" | "eps" | "fpx" | "giropay" | "grabpay" | "ideal" | "klarna" | "konbini" | "link" | "oxxo" | "p24" | "paynow" | "paypal" | "promptpay" | "sepa_debit" | "sofort" | "us_bank_account" | "wechat_pay" | "zip", ...("acss_debit" | "affirm" | "afterpay_clearpay" | "alipay" | "au_becs_debit" | "bacs_debit" | "bancontact" | "blik" | "boleto" | "card" | "cashapp" | "customer_balance" | "eps" | "fpx" | "giropay" | "grabpay" | "ideal" | "klarna" | "konbini" | "link" | "oxxo" | "p24" | "paynow" | "paypal" | "promptpay" | "sepa_debit" | "sofort" | "us_bank_account" | "wechat_pay" | "zip")[]] | undefined;
    country?: string | undefined;
}, {
    customerId: string;
    currency?: string | undefined;
    usage?: "off_session" | "on_session" | undefined;
    paymentMethodTypes?: ["acss_debit" | "affirm" | "afterpay_clearpay" | "alipay" | "au_becs_debit" | "bacs_debit" | "bancontact" | "blik" | "boleto" | "card" | "cashapp" | "customer_balance" | "eps" | "fpx" | "giropay" | "grabpay" | "ideal" | "klarna" | "konbini" | "link" | "oxxo" | "p24" | "paynow" | "paypal" | "promptpay" | "sepa_debit" | "sofort" | "us_bank_account" | "wechat_pay" | "zip", ...("acss_debit" | "affirm" | "afterpay_clearpay" | "alipay" | "au_becs_debit" | "bacs_debit" | "bancontact" | "blik" | "boleto" | "card" | "cashapp" | "customer_balance" | "eps" | "fpx" | "giropay" | "grabpay" | "ideal" | "klarna" | "konbini" | "link" | "oxxo" | "p24" | "paynow" | "paypal" | "promptpay" | "sepa_debit" | "sofort" | "us_bank_account" | "wechat_pay" | "zip")[]] | undefined;
    country?: string | undefined;
}>;
export type CreateSetupIntent = z.infer<typeof CreateSetupIntentSchema>;
export declare const ConfirmSetupIntentSchema: z.ZodObject<{
    customerId: z.ZodString;
    setupIntentId: z.ZodString;
    paymentMethodId: z.ZodString;
    setAsDefaultOnSuccess: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    paymentMethodId: string;
    setupIntentId: string;
    setAsDefaultOnSuccess?: boolean | undefined;
}, {
    customerId: string;
    paymentMethodId: string;
    setupIntentId: string;
    setAsDefaultOnSuccess?: boolean | undefined;
}>;
export type ConfirmSetupIntent = z.infer<typeof ConfirmSetupIntentSchema>;
export declare const SetDefaultPaymentMethodSchema: z.ZodObject<{
    customerId: z.ZodString;
    paymentMethodId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    paymentMethodId: string;
}, {
    customerId: string;
    paymentMethodId: string;
}>;
export type SetDefaultPaymentMethod = z.infer<typeof SetDefaultPaymentMethodSchema>;
export declare const DetachPaymentMethodSchema: z.ZodObject<{
    customerId: z.ZodString;
    paymentMethodId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    paymentMethodId: string;
}, {
    customerId: string;
    paymentMethodId: string;
}>;
export type DetachPaymentMethod = z.infer<typeof DetachPaymentMethodSchema>;
