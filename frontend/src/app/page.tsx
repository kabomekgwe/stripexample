"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type Tab =
  | "dashboard"
  | "customers"
  | "payments"
  | "methods"
  | "history"
  | "operations";

type Customer = {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  syncStatus: string;
};

type PaymentMethod = {
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

type PaymentIntentRecord = {
  id: string;
  customerId: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
};

type CheckoutSessionRecord = {
  id: string;
  customerId: string;
  mode: string;
  status: string;
  createdAt: string;
};

type RefundRecord = {
  id: string;
  paymentIntentId: string;
  amountCents: number;
  status: string;
  createdAt: string;
};

type InvoiceRecord = {
  id: string;
  stripeInvoiceId: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

type BillingTimelineResponse = {
  customerId: string;
  paymentIntents: PaymentIntentRecord[];
  refunds: RefundRecord[];
  invoices: InvoiceRecord[];
  checkoutSessions: CheckoutSessionRecord[];
};

type EnabledPaymentMethodsResponse = {
  enabledPaymentMethods: string[];
};

type CustomerMethodsResponse = {
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId: string | null;
};

type PaymentIntentCreateResponse = {
  id: string;
  customerId: string;
  stripeCustomerId: string;
  amountCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string;
  clientSecret: string | null;
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000";
const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "customers", label: "Customers" },
  { id: "payments", label: "Payments" },
  { id: "methods", label: "Payment Methods" },
  { id: "history", label: "History" },
  { id: "operations", label: "Operations" },
];

function createIdempotencyKey() {
  return crypto.randomUUID();
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

function PaymentConsole() {
  const stripe = useStripe();
  const elements = useElements();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [enabledPaymentTypes, setEnabledPaymentTypes] = useState<string[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<
    string | null
  >(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [timeline, setTimeline] = useState<BillingTimelineResponse | null>(
    null,
  );
  const [amount, setAmount] = useState("25.00");
  const [currency, setCurrency] = useState("gbp");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [statusMessage, setStatusMessage] = useState("Console ready");
  const [busy, setBusy] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((item) => item.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const customerCount = customers.length;
  const linkedCustomerCount = customers.filter((item) =>
    Boolean(item.stripeCustomerId),
  ).length;
  const successfulPayments =
    timeline?.paymentIntents.filter((item) => item.status === "succeeded")
      .length ?? 0;

  const refreshCustomers = useCallback(async () => {
    const list = await apiFetch<Customer[]>("/customers");
    setCustomers(list);
    if (!selectedCustomerId && list.length > 0) {
      setSelectedCustomerId(list[0].id);
    }
  }, [selectedCustomerId]);

  const refreshEnabledPaymentTypes = useCallback(async () => {
    const response = await apiFetch<EnabledPaymentMethodsResponse>(
      "/payments/payment-methods/enabled",
    );
    setEnabledPaymentTypes(response.enabledPaymentMethods);
  }, []);

  const refreshMethods = useCallback(async (customerId: string) => {
    const response = await apiFetch<CustomerMethodsResponse>(
      `/payments/customers/${customerId}/payment-methods`,
    );
    setMethods(response.paymentMethods);
    setDefaultPaymentMethodId(response.defaultPaymentMethodId);
  }, []);

  const refreshTimeline = useCallback(async (customerId: string) => {
    const response = await apiFetch<BillingTimelineResponse>(
      `/payments/customers/${customerId}/journeys/billing-history/timeline`,
    );
    setTimeline(response);
  }, []);

  useEffect(() => {
    void refreshCustomers();
    void refreshEnabledPaymentTypes();
  }, [refreshCustomers, refreshEnabledPaymentTypes]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setMethods([]);
      setDefaultPaymentMethodId(null);
      setTimeline(null);
      return;
    }

    void refreshMethods(selectedCustomerId);
    void refreshTimeline(selectedCustomerId);
  }, [selectedCustomerId, refreshMethods, refreshTimeline]);

  async function onCreateCustomer(event: FormEvent) {
    event.preventDefault();
    if (!newCustomerEmail) {
      setStatusMessage("Enter an email for the new customer.");
      return;
    }

    setBusy(true);
    try {
      const created = await apiFetch<{ id: string }>("/customers", {
        method: "POST",
        headers: { "idempotency-key": createIdempotencyKey() },
        body: JSON.stringify({
          email: newCustomerEmail,
          name: newCustomerName || undefined,
        }),
      });
      await refreshCustomers();
      setSelectedCustomerId(created.id);
      setNewCustomerEmail("");
      setNewCustomerName("");
      setStatusMessage("Customer created.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to create customer.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSyncCustomerCache() {
    setBusy(true);
    try {
      await apiFetch("/customers/cache/sync", {
        method: "POST",
        headers: { "idempotency-key": createIdempotencyKey() },
      });
      await refreshCustomers();
      setStatusMessage("Customer cache synchronized.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to sync customer cache.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSetDefault(paymentMethodId: string) {
    if (!selectedCustomerId) {
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/payments/payment-methods/default", {
        method: "POST",
        headers: { "idempotency-key": createIdempotencyKey() },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          paymentMethodId,
        }),
      });
      await refreshMethods(selectedCustomerId);
      setStatusMessage("Default payment method updated.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to set default payment method.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onAttachMethod(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || !selectedCustomerId) {
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setStatusMessage("Card input is not available.");
      return;
    }

    setBusy(true);
    try {
      const tokenized = await stripe.createPaymentMethod({
        type: "card",
        card,
      });
      if (tokenized.error || !tokenized.paymentMethod) {
        throw new Error(tokenized.error?.message ?? "Failed to tokenize card.");
      }

      await apiFetch("/payments/payment-methods/attach", {
        method: "POST",
        headers: { "idempotency-key": createIdempotencyKey() },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          paymentMethodId: tokenized.paymentMethod.id,
          setAsDefault: false,
        }),
      });

      await refreshMethods(selectedCustomerId);
      setStatusMessage("Payment method attached.");
      card.clear();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to attach payment method.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onMakePayment(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || !selectedCustomer) {
      return;
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setStatusMessage("Enter a valid payment amount greater than zero.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setStatusMessage("Card input is not available.");
      return;
    }

    setBusy(true);
    try {
      const intent = await apiFetch<PaymentIntentCreateResponse>(
        "/payment-intents",
        {
          method: "POST",
          headers: { "idempotency-key": createIdempotencyKey() },
          body: JSON.stringify({
            customerId: selectedCustomer.id,
            amountCents: Math.round(amountNumber * 100),
            currency,
            description: `Admin console payment for ${selectedCustomer.email}`,
          }),
        },
      );

      if (!intent.clientSecret) {
        throw new Error("Payment intent is missing client secret.");
      }

      const confirmed = await stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: { card },
      });
      if (confirmed.error) {
        throw new Error(
          confirmed.error.message ?? "Payment confirmation failed.",
        );
      }

      const paymentStatus = confirmed.paymentIntent?.status ?? intent.status;
      setStatusMessage(`Payment status: ${paymentStatus}`);
      await refreshTimeline(selectedCustomer.id);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Payment failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function renderDashboard() {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Customers
          </p>
          <p className="mt-2 text-2xl font-semibold">{customerCount}</p>
          <p className="text-sm text-slate-600">
            {linkedCustomerCount} linked to Stripe
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Enabled payment types
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {enabledPaymentTypes.length}
          </p>
          <p className="text-sm text-slate-600">
            {enabledPaymentTypes.join(", ") || "None"}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Succeeded payments
          </p>
          <p className="mt-2 text-2xl font-semibold">{successfulPayments}</p>
          <p className="text-sm text-slate-600">For selected customer</p>
        </article>
      </section>
    );
  }

  function renderCustomers() {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Create customer</h2>
          <form className="mt-3 space-y-3" onSubmit={onCreateCustomer}>
            <input
              className="w-full rounded-md border border-slate-300 p-2"
              placeholder="billing@company.com"
              value={newCustomerEmail}
              onChange={(event) => setNewCustomerEmail(event.target.value)}
            />
            <input
              className="w-full rounded-md border border-slate-300 p-2"
              placeholder="Billing Contact (optional)"
              value={newCustomerName}
              onChange={(event) => setNewCustomerName(event.target.value)}
            />
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              Create customer
            </button>
          </form>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Customer list</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-auto">
            {customers.map((customer) => (
              <li
                key={customer.id}
                className={`rounded-md border p-3 ${customer.id === selectedCustomerId ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
              >
                <button
                  className="w-full text-left"
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <p className="font-medium">{customer.email}</p>
                  <p className="text-xs text-slate-500">{customer.id}</p>
                  <p className="text-xs text-slate-600">
                    {customer.syncStatus}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
    );
  }

  function renderPayments() {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Make payment</h2>
        <p className="text-sm text-slate-600">
          Customer stays in app, no Stripe redirect.
        </p>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={onMakePayment}
        >
          <input
            className="rounded-md border border-slate-300 p-2"
            type="number"
            min="0.50"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 p-2"
            maxLength={8}
            placeholder="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toLowerCase())}
          />
          <div className="md:col-span-2 rounded-md border border-slate-300 p-3">
            <CardElement />
          </div>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"
            type="submit"
            disabled={busy || !selectedCustomer}
          >
            Pay now
          </button>
        </form>
      </section>
    );
  }

  function renderMethods() {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Enabled payment types</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {enabledPaymentTypes.map((type) => (
              <span
                key={type}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm"
              >
                {type}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Attach method</h2>
          <form className="mt-3 space-y-3" onSubmit={onAttachMethod}>
            <div className="rounded-md border border-slate-300 p-3">
              <CardElement />
            </div>
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={busy || !selectedCustomerId}
            >
              Attach card
            </button>
          </form>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Saved methods</h2>
          <ul className="mt-3 space-y-2">
            {methods.map((method) => (
              <li
                key={method.id}
                className="flex items-center justify-between rounded-md border border-slate-200 p-3"
              >
                <div>
                  <p className="font-medium">
                    {method.card
                      ? `${method.card.brand.toUpperCase()} **** ${method.card.last4}`
                      : method.type}
                  </p>
                  <p className="text-xs text-slate-500">{method.id}</p>
                </div>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  type="button"
                  disabled={busy || defaultPaymentMethodId === method.id}
                  onClick={() => onSetDefault(method.id)}
                >
                  {defaultPaymentMethodId === method.id
                    ? "Default"
                    : "Set default"}
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
    );
  }

  function renderHistory() {
    return (
      <section className="grid gap-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Payment intents</h2>
          <ul className="mt-3 space-y-2">
            {timeline?.paymentIntents.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  {formatMoney(item.amountCents, item.currency)} - {item.status}
                </p>
                <p className="text-xs text-slate-500">
                  {item.id} · {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Refunds</h2>
          <ul className="mt-3 space-y-2">
            {timeline?.refunds.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  {formatMoney(item.amountCents, "gbp")} - {item.status}
                </p>
                <p className="text-xs text-slate-500">
                  {item.id} · {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <ul className="mt-3 space-y-2">
            {timeline?.invoices.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  Due {formatMoney(item.amountDueCents, item.currency)} · Paid{" "}
                  {formatMoney(item.amountPaidCents, item.currency)}
                </p>
                <p className="text-xs text-slate-500">
                  {item.id} · {item.status}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    );
  }

  function renderOperations() {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Operations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administrative and cache operations.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            type="button"
            onClick={onSyncCustomerCache}
            disabled={busy}
          >
            Sync customer cache
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2"
            type="button"
            onClick={() =>
              selectedCustomerId && void refreshTimeline(selectedCustomerId)
            }
            disabled={busy || !selectedCustomerId}
          >
            Refresh history
          </button>
        </div>
      </section>
    );
  }

  const content = {
    dashboard: renderDashboard(),
    customers: renderCustomers(),
    payments: renderPayments(),
    methods: renderMethods(),
    history: renderHistory(),
    operations: renderOperations(),
  }[activeTab];

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-2xl font-semibold">Billing Admin Console</h1>
          <p className="mt-1 text-sm text-slate-600">
            Backend: {BACKEND_BASE_URL}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Active customer</span>
              <select
                className="w-full rounded-md border border-slate-300 p-2"
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium">Customer context</p>
              <p className="text-slate-600">
                {selectedCustomer?.email ?? "No customer selected"}
              </p>
              <p className="text-xs text-slate-500">
                {selectedCustomer?.id ?? "-"}
              </p>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {content}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Console status
          </h2>
          <p className="mt-2 text-sm">{statusMessage}</p>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  if (!STRIPE_PUBLISHABLE_KEY || !stripePromise) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Configure
          frontend env to use payment forms.
        </div>
      </main>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentConsole />
    </Elements>
  );
}
