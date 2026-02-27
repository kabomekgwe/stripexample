"use client";

import { type FormEvent, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCustomerContext } from "@/components/admin/customer-context";
import {
  apiFetch,
  createIdempotencyKey,
  type PaymentIntentCreateResponse,
} from "@/lib/console-api";

export default function PaymentsPage() {
  const stripe = useStripe();
  const elements = useElements();
  const { selectedCustomer } = useCustomerContext();

  const [amount, setAmount] = useState("25.00");
  const [currency, setCurrency] = useState("gbp");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

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
        throw new Error(confirmed.error.message ?? "Payment confirmation failed.");
      }

      const paymentStatus = confirmed.paymentIntent?.status ?? intent.status;
      setStatusMessage(`Payment status: ${paymentStatus}`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Payment failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Make payment</h2>
        <p className="text-sm text-slate-600">
          Customer stays in app, no Stripe redirect.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onMakePayment}>
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
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"
            type="submit"
            disabled={busy || !selectedCustomer}
          >
            Pay now
          </button>
        </form>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Status
        </h2>
        <p className="mt-2 text-sm">{statusMessage}</p>
      </article>
    </section>
  );
}
