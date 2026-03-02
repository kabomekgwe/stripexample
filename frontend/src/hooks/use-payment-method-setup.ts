"use client";

import { useCallback, useState } from "react";
import { apiFetch, createIdempotencyKey } from "@/lib/console-api";

export interface SetupIntentResponse {
  setupIntentId: string;
  clientSecret: string;
  status: string;
  paymentMethodTypes: string[];
}

export interface CreateSetupIntentParams {
  customerId: string;
  paymentMethodTypes: string[];
  currency?: string;
  usage?: "off_session" | "on_session";
}

export interface ConfirmSetupIntentParams {
  customerId: string;
  setupIntentId: string;
  paymentMethodId: string;
  setAsDefaultOnSuccess?: boolean;
}

export function usePaymentMethodSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSetupIntent = useCallback(
    async (params: CreateSetupIntentParams): Promise<SetupIntentResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<SetupIntentResponse>(
          "/payments/setup-intent",
          {
            method: "POST",
            headers: {
              "idempotency-key": createIdempotencyKey(),
            },
            body: JSON.stringify({
              customerId: params.customerId,
              paymentMethodTypes: params.paymentMethodTypes,
              currency: params.currency ?? "gbp",
              usage: params.usage ?? "off_session",
            }),
          },
        );
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create setup intent";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const confirmSetupIntent = useCallback(
    async (params: ConfirmSetupIntentParams): Promise<{
      status: string;
      paymentMethodId: string | null;
      lastSetupError: string | null;
    }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<{
          status: string;
          paymentMethodId: string | null;
          lastSetupError: string | null;
        }>("/payments/setup-intent/confirm", {
          method: "POST",
          headers: {
            "idempotency-key": createIdempotencyKey(),
          },
          body: JSON.stringify({
            customerId: params.customerId,
            setupIntentId: params.setupIntentId,
            paymentMethodId: params.paymentMethodId,
            setAsDefaultOnSuccess: params.setAsDefaultOnSuccess ?? false,
          }),
        });
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to confirm setup intent";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    createSetupIntent,
    confirmSetupIntent,
    loading,
    error,
    clearError: () => setError(null),
  };
}
