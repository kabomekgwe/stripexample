export type PaymentMethodConfig = {
  allowed: string[];
  captureMethod: 'automatic' | 'automatic_async' | 'manual';
};

export function buildPaymentMethodConfig(
  currency: string,
): PaymentMethodConfig {
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
