import { useState, useCallback } from "react";
import type { Order, OrderStatus, CourierUser } from "./types";

// ── Auth method types ─────────────────────────────────────────────────
export type AuthMethod = "pin" | "pattern" | "password";

export interface AccountLookup {
  role: "customer" | "operator" | "courier" | "superadmin";
  id: string;
  name: string;
  authMethod: AuthMethod;
  authKey: string;
}

// ── Static account types ──────────────────────────────────────────────
export interface OperatorAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  authMethod: AuthMethod;
  authKey: string;
  createdAt: string;
  active: boolean;
}

export interface CourierAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  authMethod: AuthMethod;
  authKey: string;
  vehicle: "мотоцикл" | "автомашин" | "дугуй" | "мопед";
  available: boolean;
  rating: number;
  totalDeliveries: number;
  todayDeliveries: number;
  createdAt: string;
  active: boolean;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  authMethod: "pin" | "pattern";
  authKey: string;
  createdAt: string;
}

// ── Superadmin ────────────────────────────────────────────────────────
export const SUPERADMIN = {
  id: "sa1",
  name: "Супер Админ",
  username: "superadmin",
  password: "gegee0011",
  phone: "99739959",
  authMethod: "password" as AuthMethod,
  authKey: "gegee0011",
};

// ── Seed data ─────────────────────────────────────────────────────────
const SEED_OPERATORS: OperatorAccount[] = [
  { id: "op1", name: "Д. Дэлгэрмаа",  username: "delgermaa",    password: "op2024", phone: "99110001", authMethod: "pin",     authKey: "1234", createdAt: "2024-01-10", active: true },
  { id: "op2", name: "Б. Наранцэцэг", username: "narantsetseg", password: "op2024", phone: "99220002", authMethod: "pin",     authKey: "5678", createdAt: "2024-02-14", active: true },
];

const SEED_COURIERS: CourierAccount[] = [
  { id: "cr1", name: "Б. Мөнхбат",   username: "munkh",      password: "cr2024", phone: "99112233", authMethod: "pin",     authKey: "1111", vehicle: "мотоцикл",  available: true,  rating: 4.9, totalDeliveries: 1240, todayDeliveries: 8,  createdAt: "2023-06-01", active: true },
  { id: "cr2", name: "Д. Эрдэнэ",    username: "erdene",     password: "cr2024", phone: "99223344", authMethod: "pin",     authKey: "2222", vehicle: "автомашин", available: true,  rating: 4.7, totalDeliveries: 876,  todayDeliveries: 5,  createdAt: "2023-08-15", active: true },
  { id: "cr3", name: "О. Батжаргал", username: "batjargal",  password: "cr2024", phone: "99334455", authMethod: "pattern", authKey: "01345678", vehicle: "дугуй",     available: false, rating: 4.8, totalDeliveries: 2103, todayDeliveries: 12, createdAt: "2023-03-20", active: true },
  { id: "cr4", name: "Н. Солонго",   username: "solongo",    password: "cr2024", phone: "99445566", authMethod: "pin",     authKey: "4444", vehicle: "мопед",     available: true,  rating: 4.6, totalDeliveries: 523,  todayDeliveries: 3,  createdAt: "2024-04-05", active: true },
];

// ── Order seed ────────────────────────────────────────────────────────
let orderCounter = 1001;

function nowTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function etaTime(mins: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function newId() { return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000); }

const SEED_ORDERS: Order[] = [
  {
    id: "1000", fromAddress: "Сүхбаатар дүүрэг", toAddress: "Хан-Уул дүүрэг",
    fromDetail: "1-р хороо, Энхтайваны өргөн чөлөө 15", toDetail: "15-р хороо, Зайсан тойрог",
    packageNote: "Бичиг баримт", price: 12000, distance: 14,
    status: "шинэ", createdAt: "13:42", customerName: "Э. Батцэцэг",
    customerPhone: "9955-6677", customerId: "cu1",
  },
  {
    id: "999", fromAddress: "Баянзүрх дүүрэг", toAddress: "Баянгол дүүрэг",
    fromDetail: "3-р хороо, Нарны зам 7", toDetail: "6-р хороо, Элчин сайдын гудамж 44",
    packageNote: "Бэлэг", price: 8500, distance: 9, status: "авсан", createdAt: "12:15",
    courierId: "cr3", courierName: "О. Батжаргал", courierPhone: "9933-4455",
    eta: etaTime(12), customerName: "Б. Оюунаа", customerPhone: "9966-7788",
    customerId: "cu2", assignedAt: "12:18", pickedUpAt: "12:32",
  },
];

// ── Main store hook ───────────────────────────────────────────────────
export function useStore() {
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [operatorAccounts, setOperatorAccounts] = useState<OperatorAccount[]>(SEED_OPERATORS);
  const [courierAccounts, setCourierAccounts] = useState<CourierAccount[]>(SEED_COURIERS);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);

  const couriers: CourierUser[] = courierAccounts.filter((c) => c.active).map(
    ({ id, name, phone, vehicle, available, rating, totalDeliveries, todayDeliveries }) =>
      ({ id, name, phone, vehicle, available, rating, totalDeliveries, todayDeliveries })
  );

  // ── Phone-based auth lookup ────────────────────────────────────────
  function resolveByPhone(rawPhone: string): AccountLookup | null {
    const phone = rawPhone.replace(/\D/g, "");
    if (phone === SUPERADMIN.phone.replace(/\D/g, ""))
      return { role: "superadmin", id: SUPERADMIN.id, name: SUPERADMIN.name, authMethod: "password", authKey: SUPERADMIN.password };
    const op = operatorAccounts.find((o) => o.phone.replace(/\D/g, "") === phone && o.active);
    if (op) return { role: "operator", id: op.id, name: op.name, authMethod: op.authMethod, authKey: op.authKey };
    const cr = courierAccounts.find((c) => c.phone.replace(/\D/g, "") === phone && c.active);
    if (cr) return { role: "courier", id: cr.id, name: cr.name, authMethod: cr.authMethod, authKey: cr.authKey };
    const cu = customerAccounts.find((c) => c.phone.replace(/\D/g, "") === phone);
    if (cu) return { role: "customer", id: cu.id, name: cu.name, authMethod: cu.authMethod, authKey: cu.authKey };
    return null;
  }

  // ── Customer registration ──────────────────────────────────────────
  const addCustomer = useCallback((data: { name: string; phone: string; authMethod: "pin" | "pattern"; authKey: string }) => {
    const id = "cu-" + newId();
    const cu: CustomerAccount = { ...data, id, createdAt: new Date().toISOString().slice(0, 10) };
    setCustomerAccounts((prev) => [...prev, cu]);
    return id;
  }, []);

  // ── Orders ─────────────────────────────────────────────────────────
  const addOrder = useCallback((order: Omit<Order, "id" | "createdAt" | "status">) => {
    const id = String(++orderCounter);
    setOrders((prev) => [{ ...order, id, createdAt: nowTime(), status: "шинэ" }, ...prev]);
    return id;
  }, []);

  const assignCourier = useCallback((orderId: string, courierId: string) => {
    setCourierAccounts((prev) => prev.map((c) => c.id === courierId ? { ...c, available: false } : c));
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const cr = courierAccounts.find((c) => c.id === courierId)!;
      return { ...o, status: "томилогдсон" as OrderStatus, courierId, courierName: cr.name, courierPhone: cr.phone, eta: etaTime(30), assignedAt: nowTime() };
    }));
  }, [courierAccounts]);

  const courierUpdateStatus = useCallback((orderId: string, status: "авсан" | "хүргэгдсэн") => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      if (status === "авсан") return { ...o, status, pickedUpAt: nowTime(), eta: etaTime(20) };
      setCourierAccounts((prev) => prev.map((c) =>
        c.id === o.courierId ? { ...c, available: true, todayDeliveries: c.todayDeliveries + 1 } : c
      ));
      return { ...o, status, deliveredAt: nowTime() };
    }));
  }, []);

  // ── Auth: update PIN/Pattern after first login ─────────────────────
  const updateAccountAuth = useCallback((role: "operator" | "courier", id: string, authMethod: "pin" | "pattern", authKey: string) => {
    if (role === "operator")
      setOperatorAccounts((prev) => prev.map((o) => o.id === id ? { ...o, authMethod, authKey } : o));
    else
      setCourierAccounts((prev) => prev.map((c) => c.id === id ? { ...c, authMethod, authKey } : c));
  }, []);

  // ── Superadmin: operator CRUD ───────────────────────────────────────
  const addOperator = useCallback((data: { name: string; username: string; password: string; phone: string }) => {
    const op: OperatorAccount = {
      ...data, authMethod: "password", authKey: data.password,
      id: newId(), createdAt: new Date().toISOString().slice(0, 10), active: true,
    };
    setOperatorAccounts((prev) => [...prev, op]);
  }, []);

  const updateOperator = useCallback((id: string, data: Partial<Omit<OperatorAccount, "id">>) => {
    setOperatorAccounts((prev) => prev.map((o) => o.id === id ? { ...o, ...data } : o));
  }, []);

  const deleteOperator = useCallback((id: string) => {
    setOperatorAccounts((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // ── Superadmin: courier CRUD ────────────────────────────────────────
  const addCourier = useCallback((data: { name: string; username: string; password: string; phone: string; vehicle: CourierAccount["vehicle"] }) => {
    const cr: CourierAccount = {
      ...data, authMethod: "password", authKey: data.password,
      id: newId(), createdAt: new Date().toISOString().slice(0, 10),
      active: true, available: true, rating: 5.0, totalDeliveries: 0, todayDeliveries: 0,
    };
    setCourierAccounts((prev) => [...prev, cr]);
  }, []);

  const updateCourier = useCallback((id: string, data: Partial<Omit<CourierAccount, "id">>) => {
    setCourierAccounts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteCourier = useCallback((id: string) => {
    setCourierAccounts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    orders, couriers,
    operatorAccounts, courierAccounts, customerAccounts,
    addOrder, assignCourier, courierUpdateStatus,
    addOperator, updateOperator, deleteOperator,
    addCourier, updateCourier, deleteCourier,
    resolveByPhone, addCustomer, updateAccountAuth,
  };
}
