"use client";

import { useState } from "react";

interface PaymentMethodInfo {
  type: string;
  name: string;
  icon: string;
  redirectRequired: boolean;
}

const PAYMENT_METHOD_INFO: Record<string, PaymentMethodInfo> = {
  bancontact: {
    type: "bancontact",
    name: "Bancontact",
    icon: "💳",
    redirectRequired: true,
  },
  blik: {
    type: "blik",
    name: "BLIK",
    icon: "🔵",
    redirectRequired: false,
  },
  card: {
    type: "card",
    name: "Card",
    icon: "💳",
    redirectRequired: false,
  },
  eps: {
    type: "eps",
    name: "EPS",
    icon: "🏦",
    redirectRequired: true,
  },
  giropay: {
    type: "giropay",
    name: "GiroPay",
    icon: "🏦",
    redirectRequired: true,
  },
  klarna: {
    type: "klarna",
    name: "Klarna",
    icon: "🛍️",
    redirectRequired: true,
  },
  link: {
    type: "link",
    name: "Link",
    icon: "🔗",
    redirectRequired: false,
  },
};

interface PaymentMethodSelectorProps {
  availableMethods: string[];
  selectedMethodId?: string | null;
  defaultMethodId?: string | null;
  onSelect: (methodType: string) => void;
  onSetDefault: (methodId: string) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  availableMethods,
  selectedMethodId,
  defaultMethodId,
  onSelect,
  onSetDefault,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const enabledMethods = availableMethods
    .map((type) => PAYMENT_METHOD_INFO[type])
    .filter(Boolean);

  if (enabledMethods.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 text-center text-slate-500">
        No payment methods available. Please enable payment methods in Stripe
        Dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-700">
          Select Payment Method
        </h3>
        <p className="text-xs text-slate-500">
          Choose how you&apos;d like to pay
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enabledMethods.map((method) => {
          const isSelected = selectedMethodId === method.type;
          const isDefault = defaultMethodId === method.type;

          return (
            <button
              key={method.type}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(method.type)}
              onMouseEnter={() => setHoveredMethod(method.type)}
              onMouseLeave={() => setHoveredMethod(null)}
              className={`
                relative flex flex-col items-start rounded-lg border-2 p-3 text-left transition-all
                ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }
                ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              `}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-lg">{method.icon}</span>
                <span className="text-sm font-medium text-slate-900">
                  {method.name}
                </span>
              </div>

              <div className="mt-2 flex w-full items-center justify-between">
                <span
                  className={`text-xs ${
                    method.redirectRequired
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
                >
                  {method.redirectRequired ? (
                    <span className="flex items-center gap-1">
                      <span>↗</span> Redirect required
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span>✓</span> In-app
                    </span>
                  )}
                </span>

                {isDefault && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Default
                  </span>
                )}
              </div>

              {hoveredMethod === method.type && !isSelected && !disabled && (
                <div className="absolute -bottom-8 left-1/2 z-10 w-max -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-white">
                  Click to select
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedMethodId && selectedMethodId !== defaultMethodId && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSetDefault(selectedMethodId!)}
          className="text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
        >
          Set {PAYMENT_METHOD_INFO[selectedMethodId]?.name ?? selectedMethodId}{" "}
          as default
        </button>
      )}
    </div>
  );
}

export function getPaymentMethodInfo(type: string): PaymentMethodInfo | undefined {
  return PAYMENT_METHOD_INFO[type];
}

export function isRedirectRequired(type: string): boolean {
  return PAYMENT_METHOD_INFO[type]?.redirectRequired ?? false;
}
