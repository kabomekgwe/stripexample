"use client";

import { useState } from "react";
import { useCustomerContext } from "@/components/admin/customer-context";
import { apiFetch, createIdempotencyKey } from "@/lib/console-api";

export default function OperationsPage() {
  const { selectedCustomerId, refreshCustomers } = useCustomerContext();
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

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
        error instanceof Error ? error.message : "Failed to sync customer cache.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshHistory() {
    if (!selectedCustomerId) {
      setStatusMessage("Select a customer first.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(
        `/payments/customers/${selectedCustomerId}/journeys/billing-history/timeline`,
      );
      setStatusMessage("History refreshed.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to refresh history.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Operations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administrative and cache operations.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            type="button"
            onClick={onSyncCustomerCache}
            disabled={busy}
          >
            Sync customer cache
          </button>
          <button
            className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
            type="button"
            onClick={onRefreshHistory}
            disabled={busy || !selectedCustomerId}
          >
            Refresh history
          </button>
        </div>
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
