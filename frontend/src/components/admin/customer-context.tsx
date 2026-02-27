"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, type Customer } from "@/lib/console-api";

type CustomerContextValue = {
  customers: Customer[];
  selectedCustomerId: string;
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (customerId: string) => void;
  refreshCustomers: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const refreshCustomers = useCallback(async () => {
    const customerList = await apiFetch<Customer[]>("/customers");
    setCustomers(customerList);
    if (!selectedCustomerId && customerList.length > 0) {
      setSelectedCustomerId(customerList[0].id);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    let isActive = true;

    void apiFetch<Customer[]>("/customers").then((customerList) => {
      if (!isActive) {
        return;
      }
      setCustomers(customerList);
      if (!selectedCustomerId && customerList.length > 0) {
        setSelectedCustomerId(customerList[0].id);
      }
    });

    return () => {
      isActive = false;
    };
  }, [selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const value = useMemo(
    () => ({
      customers,
      selectedCustomerId,
      selectedCustomer,
      setSelectedCustomerId,
      refreshCustomers,
    }),
    [customers, selectedCustomerId, selectedCustomer, refreshCustomers],
  );

  return (
    <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
  );
}

export function useCustomerContext() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomerContext must be used within CustomerProvider");
  }
  return context;
}
