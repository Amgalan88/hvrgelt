import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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
  pin: string | null;
  setPin: (pin: string | null) => void;
  pattern: string | null;
  setPattern: (p: string | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

const DEFAULT_ADDRESSES: SavedAddress[] = [
  { id: "sa1", label: "Гэр", address: "Баянзүрх дүүрэг", detail: "3-р хороо, Нарны зам 7, 204 тоот", icon: "home" },
  { id: "sa2", label: "Ажил", address: "Сүхбаатар дүүрэг", detail: "1-р хороо, Энхтайваны өргөн чөлөө 15", icon: "work" },
];

export function UserProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(DEFAULT_ADDRESSES);
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

  function addAddress(a: Omit<SavedAddress, "id">) {
    setSavedAddresses((prev) => [...prev, { ...a, id: "sa-" + Date.now() }]);
  }

  function removeAddress(id: string) {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <UserContext.Provider value={{ theme, toggleTheme, savedAddresses, addAddress, removeAddress, pin, setPin, pattern, setPattern }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}
