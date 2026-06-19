import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  detail: string;
  icon: "home" | "work" | "other";
}

export interface QuickOrder {
  id: string;
  label: string;
  emoji: string;
  fromAddress: string;
  fromDetail: string;
  toAddress: string;
  toDetail: string;
}

interface UserContextValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
  savedAddresses: SavedAddress[];
  addAddress: (a: Omit<SavedAddress, "id">) => void;
  updateAddress: (id: string, a: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  quickOrders: QuickOrder[];
  saveQuickOrders: (list: QuickOrder[]) => void;
  loadCustomer: (customerId: string) => Promise<void>;
  clearCustomer: () => void;
  pin: string | null;
  setPin: (pin: string | null) => void;
  pattern: string | null;
  setPattern: (p: string | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [quickOrders, setQuickOrders] = useState<QuickOrder[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [pattern, setPattern] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-mode");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light-mode");
      root.classList.add("dark");
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  // Load a customer's saved addresses + quick orders from the DB on login
  const loadCustomer = useCallback(async (cid: string) => {
    setCustomerId(cid);
    const { data } = await supabase.from("customers").select("addresses, quick_orders").eq("id", cid).single();
    setSavedAddresses((data?.addresses as SavedAddress[]) ?? []);
    setQuickOrders((data?.quick_orders as QuickOrder[]) ?? []);
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomerId(null);
    setSavedAddresses([]);
    setQuickOrders([]);
  }, []);

  // Persist the full address list to the DB
  async function persistAddresses(next: SavedAddress[]) {
    setSavedAddresses(next);
    if (customerId) await supabase.from("customers").update({ addresses: next }).eq("id", customerId);
  }

  function addAddress(a: Omit<SavedAddress, "id">) {
    persistAddresses([...savedAddresses, { ...a, id: "sa-" + Date.now() }]);
  }

  function updateAddress(id: string, a: Omit<SavedAddress, "id">) {
    persistAddresses(savedAddresses.map((x) => (x.id === id ? { ...a, id } : x)));
  }

  function removeAddress(id: string) {
    persistAddresses(savedAddresses.filter((a) => a.id !== id));
  }

  // Persist the full quick-order list to the DB
  function saveQuickOrders(list: QuickOrder[]) {
    setQuickOrders(list);
    if (customerId) supabase.from("customers").update({ quick_orders: list }).eq("id", customerId).then(() => {});
  }

  return (
    <UserContext.Provider value={{ theme, toggleTheme, savedAddresses, addAddress, updateAddress, removeAddress, quickOrders, saveQuickOrders, loadCustomer, clearCustomer, pin, setPin, pattern, setPattern }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}
