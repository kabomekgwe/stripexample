"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BACKEND_BASE_URL } from "@/lib/console-api";
import { useCustomerContext } from "./customer-context";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/payments", label: "Payments" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/history", label: "History" },
  { href: "/operations", label: "Operations" },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { customers, selectedCustomer, selectedCustomerId, setSelectedCustomerId } =
    useCustomerContext();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 p-4 lg:grid-cols-[240px_1fr] lg:p-6">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Billing Admin
          </p>
          <h1 className="mt-2 text-xl font-semibold">Console</h1>
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActivePath(pathname, item.href)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Backend: {BACKEND_BASE_URL}</p>
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
          {children}
        </section>
      </div>
    </main>
  );
}
