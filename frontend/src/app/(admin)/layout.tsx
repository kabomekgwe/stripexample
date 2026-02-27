"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerProvider } from "@/components/admin/customer-context";

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

export default function AdminLayout({ children }: { children: ReactNode }) {
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
      <CustomerProvider>
        <AdminShell>{children}</AdminShell>
      </CustomerProvider>
    </Elements>
  );
}
