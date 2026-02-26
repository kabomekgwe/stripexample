export const PAYMENT_METHOD_ATTACH_IF_EXISTS = ['reuse', 'error'] as const;

export type PaymentMethodAttachIfExists =
  (typeof PAYMENT_METHOD_ATTACH_IF_EXISTS)[number];
