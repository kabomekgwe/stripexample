"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useCustomerContext } from "@/components/admin/customer-context";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import {
  apiFetch,
  createIdempotencyKey,
  type CustomerMethodsResponse,
  type EnabledPaymentMethodsResponse,
  type PaymentMethod,
} from "@/lib/console-api";

type PaymentFlowState = "select" | "attach" | "confirm" | "complete";

export default function PaymentMethodsPage() {
  const stripe = useStripe();
  const elements = useElements();
  const { selectedCustomerId } = useCustomerContext();

  const [enabledPaymentTypes, setEnabledPaymentTypes] = useState<string[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

  const [flowState, setFlowState] = useState<PaymentFlowState>("select");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<EnabledPaymentMethodsResponse>("/payments/payment-methods/enabled")
      .then((response) => setEnabledPaymentTypes(response.enabledPaymentMethods))
      .catch(() => setEnabledPaymentTypes([]));
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) return;

    void apiFetch<CustomerMethodsResponse>(
      `/payments/customers/${selectedCustomerId}/payment-methods`,
    )
      .then((response) => {
        setMethods(response.paymentMethods);
        setDefaultPaymentMethodId(response.defaultPaymentMethodId);
      })
      .catch(() => {
        setMethods([]);
        setDefaultPaymentMethodId(null);
      });
  }, [selectedCustomerId]);

  const selectedMethods = selectedCustomerId ? methods : [];
  const selectedDefaultMethodId = selectedCustomerId ? defaultPaymentMethodId : null;

  async function refreshMethodsForSelectedCustomer() {
    if (!selectedCustomerId) {
      return;
    }
    const response = await apiFetch<CustomerMethodsResponse>(
      `/payments/customers/${selectedCustomerId}/payment-methods`,
    );
    setMethods(response.paymentMethods);
    setDefaultPaymentMethodId(response.defaultPaymentMethodId);
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
      await refreshMethodsForSelectedCustomer();
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

  function handlePaymentTypeSelect(methodType: string) {
    setSelectedPaymentType(methodType);
    setFlowState("attach");
  }

  function handleCancelAttach() {
    setSelectedPaymentType(null);
    setSetupIntentClientSecret(null);
    setFlowState("select");
  }

  async function onAttachMethod(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || !selectedCustomerId || !selectedPaymentType) {
      return;
    }

    if (selectedPaymentType === "card") {
      await attachCardMethod();
    } else {
      await initializePaymentMethodFlow(selectedPaymentType);
    }
  }

  async function attachCardMethod() {
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

      await refreshMethodsForSelectedCustomer();
      setStatusMessage("Payment method attached.");
      card.clear();
      handleCancelAttach();
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

  async function initializePaymentMethodFlow(paymentMethodType: string) {
    if (!selectedCustomerId) {
      return;
    }

    setBusy(true);
    try {
      const response = await apiFetch<{
        clientSecret: string;
      }>("/payments/setup-intent", {
        method: "POST",
        headers: { "idempotency-key": createIdempotencyKey() },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          paymentMethodTypes: [paymentMethodType],
          currency: "gbp",
          usage: "off_session",
        }),
      });

      setSetupIntentClientSecret(response.clientSecret);
      setFlowState("confirm");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to initialize payment method flow.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
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

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Add payment method</h2>
          
          {flowState === "select" && (
            <div className="mt-3">
              <PaymentMethodSelector
                availableMethods={enabledPaymentTypes}
                selectedMethodId={selectedPaymentType}
                defaultMethodId={selectedDefaultMethodId}
                onSelect={handlePaymentTypeSelect}
                onSetDefault={onSetDefault}
                disabled={busy || !selectedCustomerId}
              />
            </div>
          )}

          {flowState === "attach" && selectedPaymentType && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Adding: {selectedPaymentType}
                </p>
                <button
                  type="button"
                  onClick={handleCancelAttach}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>

              {selectedPaymentType === "card" ? (
                <form onSubmit={onAttachMethod} className="space-y-3">
                  <div className="rounded-md border border-slate-300 p-3">
                    <CardElement />
                  </div>
                  <button
                    className="cursor-pointer rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Attaching..." : "Attach card"}
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    This payment method requires redirection to complete setup.
                    Click &quot;Continue&quot; to proceed.
                  </p>
                  <button
                    type="button"
                    className="mt-3 cursor-pointer rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
                    onClick={() => onAttachMethod(new Event("submit") as unknown as FormEvent<HTMLFormElement>)}
                    disabled={busy}
                  >
                    {busy ? "Processing..." : "Continue"}
                  </button>
                </div>
              )}
            </div>
          )}

          {flowState === "confirm" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  Please complete the payment method setup in the redirected flow.
                </p>
                <p className="mt-2 text-xs text-blue-600">
                  Client secret: {setupIntentClientSecret?.slice(0, 20)}...
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelAttach}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel and go back
              </button>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Saved methods</h2>
          <ul className="mt-3 space-y-2">
            {selectedMethods.map((method) => (
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
                  className="cursor-pointer rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  type="button"
                  disabled={busy || selectedDefaultMethodId === method.id}
                  onClick={() => onSetDefault(method.id)}
                >
                  {selectedDefaultMethodId === method.id ? "Default" : "Set default"}
                </button>
              </li>
            ))}
            {selectedMethods.length === 0 && selectedCustomerId && (
              <li className="text-center text-sm text-slate-500 py-4">
                No payment methods saved yet. Add one above.
              </li>
            )}
          </ul>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Status
        </h2>
        <p className="mt-2 text-sm">{statusMessage}</p>
      </article>
    </section>
  );
}
