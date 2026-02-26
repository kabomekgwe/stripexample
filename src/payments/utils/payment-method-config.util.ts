import type { PaymentMethodType } from '../constants/payment-method-types';

export type PaymentMethodConfig = {
  allowed: PaymentMethodType[];
  captureMethod: 'automatic' | 'automatic_async' | 'manual';
};

export function buildPaymentMethodConfig(
  currency: string,
): PaymentMethodConfig {
  /**
   * Returns default payment-method and capture settings by currency.
   */
  const normalizedCurrency = currency.toLowerCase();

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
