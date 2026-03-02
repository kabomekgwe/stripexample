"use client";

import { type FormEvent, useState } from "react";
import { useCustomerContext } from "@/components/admin/customer-context";
import { apiFetch, createIdempotencyKey } from "@/lib/console-api";

export default function BillingPage() {
    const { selectedCustomer } = useCustomerContext();

    const [billingPeriod, setBillingPeriod] = useState(
        new Date().toISOString().substring(0, 7) // "YYYY-MM"
    );
    const [usageQuantity, setUsageQuantity] = useState("1");
    const [unitPrice, setUnitPrice] = useState("1.00");

    const [busy, setBusy] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Ready");

    async function onRecordUsage(event: FormEvent) {
        event.preventDefault();
        if (!selectedCustomer) {
            setStatusMessage("Select a customer first.");
            return;
        }
        if (!selectedCustomer.stripeCustomerId) {
            setStatusMessage("Selected customer does not have a Stripe Customer ID.");
            return;
        }

        const quantityNumber = Number(usageQuantity);
        const unitPriceNumber = Number(unitPrice);

        if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
            setStatusMessage("Enter a valid usage quantity greater than zero.");
            return;
        }

        if (!Number.isFinite(unitPriceNumber) || unitPriceNumber <= 0) {
            setStatusMessage("Enter a valid unit price greater than zero.");
            return;
        }

        setBusy(true);
        try {
            await apiFetch(
                "/billing/usage-monthly",
                {
                    method: "POST",
                    headers: { "idempotency-key": createIdempotencyKey() },
                    body: JSON.stringify({
                        stripeCustomerId: selectedCustomer.stripeCustomerId,
                        billingPeriod,
                        usageQuantity: quantityNumber,
                        unitPriceCents: Math.round(unitPriceNumber * 100),
                    }),
                },
            );
            setStatusMessage("Usage recorded successfully.");
        } catch (error) {
            setStatusMessage(
                error instanceof Error ? error.message : "Failed to record usage.",
            );
        } finally {
            setBusy(false);
        }
    }

    async function onProcessBillingQueue() {
        setBusy(true);
        try {
            await apiFetch("/billing/usage-monthly/process", {
                method: "POST",
                headers: { "idempotency-key": createIdempotencyKey() },
            });
            setStatusMessage("Billing queue processing triggered.");
        } catch (error) {
            setStatusMessage(
                error instanceof Error ? error.message : "Failed to process billing queue.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="space-y-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-semibold">Record Monthly Usage</h2>
                <p className="text-sm text-slate-600">
                    Record metered usage for the selected customer.
                </p>
                <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={onRecordUsage}>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Billing Period (YYYY-MM)</label>
                        <input
                            className="w-full rounded-md border border-slate-300 p-2"
                            placeholder="2024-03"
                            value={billingPeriod}
                            onChange={(event) => setBillingPeriod(event.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Usage Quantity</label>
                        <input
                            className="w-full rounded-md border border-slate-300 p-2"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Quantity"
                            value={usageQuantity}
                            onChange={(event) => setUsageQuantity(event.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500">Unit Price</label>
                        <input
                            className="w-full rounded-md border border-slate-300 p-2"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Price (e.g. 1.50)"
                            value={unitPrice}
                            onChange={(event) => setUnitPrice(event.target.value)}
                            required
                        />
                    </div>
                    <button
                        className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50 md:col-span-3"
                        type="submit"
                        disabled={busy || !selectedCustomer}
                    >
                        Record Usage
                    </button>
                </form>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-semibold">Billing Queue</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Process all pending usage records into Stripe invoices.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                        type="button"
                        onClick={onProcessBillingQueue}
                        disabled={busy}
                    >
                        Process Queue Now
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
