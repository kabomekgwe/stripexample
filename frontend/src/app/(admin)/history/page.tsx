"use client";

import { useEffect, useState } from "react";
import { useCustomerContext } from "@/components/admin/customer-context";
import {
  apiFetch,
  formatDate,
  formatMoney,
  type BillingTimelineResponse,
} from "@/lib/console-api";

export default function HistoryPage() {
  const { selectedCustomerId } = useCustomerContext();
  const [timeline, setTimeline] = useState<BillingTimelineResponse | null>(null);

  useEffect(() => {
    if (!selectedCustomerId) return;

    void apiFetch<BillingTimelineResponse>(
      `/payments/customers/${selectedCustomerId}/journeys/billing-history/timeline`,
    )
      .then(setTimeline)
      .catch(() => setTimeline(null));
  }, [selectedCustomerId]);

  const selectedTimeline = selectedCustomerId ? timeline : null;

  return (
    <section className="grid gap-4">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Payment intents</h2>
        <ul className="mt-3 space-y-2">
          {selectedTimeline?.paymentIntents.map((item) => (
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

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Refunds</h2>
        <ul className="mt-3 space-y-2">
          {selectedTimeline?.refunds.map((item) => (
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

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <ul className="mt-3 space-y-2">
          {selectedTimeline?.invoices.map((item) => (
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
