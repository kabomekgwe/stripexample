export type Customer = {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  syncStatus: string;
};

export type PaymentMethod = {
  id: string;
  type: string;
  isDefault: boolean;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
};

export type PaymentIntentRecord = {
  id: string;
  customerId: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
};

export type CheckoutSessionRecord = {
  id: string;
  customerId: string;
  mode: string;
  status: string;
  createdAt: string;
};

export type RefundRecord = {
  id: string;
  paymentIntentId: string;
  amountCents: number;
  status: string;
  createdAt: string;
};

export type InvoiceRecord = {
  id: string;
  stripeInvoiceId: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

export type BillingTimelineResponse = {
  customerId: string;
  paymentIntents: PaymentIntentRecord[];
  refunds: RefundRecord[];
  invoices: InvoiceRecord[];
  checkoutSessions: CheckoutSessionRecord[];
};

export type EnabledPaymentMethodsResponse = {
  enabledPaymentMethods: string[];
};

export type CustomerMethodsResponse = {
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
};

export type PaymentIntentCreateResponse = {
  id: string;
  customerId: string;
  stripeCustomerId: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string;
  clientSecret: string | null;
};

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000";

export function createIdempotencyKey() {
  return crypto.randomUUID();
}

export function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(", ")
      : (payload.message ?? `Request failed with status ${response.status}`);
    throw new Error(message);
  }

  return (await response.json()) as T;
}
