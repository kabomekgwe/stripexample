"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, type BillingTimelineResponse } from "@/lib/console-api";
import { useCustomerContext } from "@/components/admin/customer-context";

export default function DashboardPage() {
  const { customers, selectedCustomerId } = useCustomerContext();
  const [timeline, setTimeline] = useState<BillingTimelineResponse | null>(null);

  useEffect(() => {
    if (!selectedCustomerId) return;

    void apiFetch<BillingTimelineResponse>(
      `/payments/customers/${selectedCustomerId}/journeys/billing-history/timeline`,
    )
      .then(setTimeline)
      .catch(() => setTimeline(null));
  }, [selectedCustomerId]);

  const customerCount = customers.length;
  const linkedCustomerCount = useMemo(
    () => customers.filter((item) => Boolean(item.stripeCustomerId)).length,
    [customers],
  );
  const successfulPayments = selectedCustomerId
    ? timeline?.paymentIntents.filter((item) => item.status === "succeeded")
        .length ?? 0
    : 0;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Customers</p>
        <p className="mt-2 text-2xl font-semibold">{customerCount}</p>
        <p className="text-sm text-slate-600">{linkedCustomerCount} linked to Stripe</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Stripe-linked ratio
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {customerCount === 0
            ? "0%"
            : `${Math.round((linkedCustomerCount / customerCount) * 100)}%`}
        </p>
        <p className="text-sm text-slate-600">Across all known customers</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Succeeded payments
        </p>
        <p className="mt-2 text-2xl font-semibold">{successfulPayments}</p>
        <p className="text-sm text-slate-600">For selected customer</p>
      </article>
    </section>
  );
}
