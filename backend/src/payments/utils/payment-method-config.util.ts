import type { PaymentMethodType } from '../constants/payment-method-types';
import { DEFAULT_CURRENCY } from '../constants/currencies';

export const STRIPE_ENABLED_PAYMENT_METHODS: PaymentMethodType[] = [
  'bancontact',
  'blik',
  'card',
  'eps',
  'giropay',
  'klarna',
  'link',
] as const;

export const PAYMENT_METHOD_REDIRECT_REQUIRED: Record<string, boolean> = {
  bancontact: true,
  blik: false,
  card: false,
  eps: true,
  giropay: true,
  klarna: true,
  link: false,
};

export type PaymentMethodConfig = {
  allowed: PaymentMethodType[];
  captureMethod: 'automatic' | 'automatic_async' | 'manual';
};

export function buildPaymentMethodConfig(
  currency?: string,
): PaymentMethodConfig {
  const normalizedCurrency = (currency ?? DEFAULT_CURRENCY).toLowerCase();

  if (normalizedCurrency === 'gbp') {
    return {
      allowed: [...STRIPE_ENABLED_PAYMENT_METHODS],
      captureMethod: 'automatic',
    };
  }

  if (normalizedCurrency === 'usd' || normalizedCurrency === 'eur') {
    return {
      allowed: ['card', 'link'],
      captureMethod: 'automatic_async',
    };
  }

  return {
    allowed: ['card'],
    captureMethod: 'automatic',
  };
}
