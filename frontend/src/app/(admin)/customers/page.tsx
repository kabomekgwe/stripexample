"use client";

import { type FormEvent, useState } from "react";
import { useCustomerContext } from "@/components/admin/customer-context";
import { apiFetch, createIdempotencyKey } from "@/lib/console-api";

export default function CustomersPage() {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    refreshCustomers,
  } = useCustomerContext();

  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

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

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
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

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Customer list</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-auto">
            {customers.map((customer) => (
              <li
                key={customer.id}
                className={`rounded-md border p-3 ${
                  customer.id === selectedCustomerId
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200"
                }`}
              >
                <button
                  className="w-full cursor-pointer text-left"
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <p className="font-medium">{customer.email}</p>
                  <p className="text-xs text-slate-500">{customer.id}</p>
                  <p className="text-xs text-slate-600">{customer.syncStatus}</p>
                </button>
              </li>
            ))}
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
