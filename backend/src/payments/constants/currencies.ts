export const ALLOWED_CURRENCIES = ['gbp'] as const;

export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: AllowedCurrency = 'gbp';

export const CURRENCY_SYMBOLS: Record<AllowedCurrency, string> = {
  gbp: '£',
} as const;

export const CURRENCY_DECIMAL_PLACES: Record<AllowedCurrency, number> = {
  gbp: 2,
} as const;
