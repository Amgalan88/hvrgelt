import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  detail: string;
  icon: "home" | "work" | "other";
}

interface UserContextValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
  savedAddresses: SavedAddress[];
  addAddress: (a: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
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

  // Load a customer's saved addresses from the DB on login
  const loadCustomer = useCallback(async (cid: string) => {
    setCustomerId(cid);
    const { data } = await supabase.from("customers").select("addresses").eq("id", cid).single();
    setSavedAddresses((data?.addresses as SavedAddress[]) ?? []);
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomerId(null);
    setSavedAddresses([]);
  }, []);

  // Persist the full address list to the DB
  async function persistAddresses(next: SavedAddress[]) {
    setSavedAddresses(next);
    if (customerId) await supabase.from("customers").update({ addresses: next }).eq("id", customerId);
  }

  function addAddress(a: Omit<SavedAddress, "id">) {
    persistAddresses([...savedAddresses, { ...a, id: "sa-" + Date.now() }]);
  }

  function removeAddress(id: string) {
    persistAddresses(savedAddresses.filter((a) => a.id !== id));
  }

  return (
    <UserContext.Provider value={{ theme, toggleTheme, savedAddresses, addAddress, removeAddress, loadCustomer, clearCustomer, pin, setPin, pattern, setPattern }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}
