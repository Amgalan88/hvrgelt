import { useState, useCallback, useEffect } from "react";
import type { Order, OrderStatus, CourierUser } from "./types";
import { supabase } from "../../lib/supabase";

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

// ── Superadmin (программ дотор тодорхойлогдсон) ────────────────────────
export const SUPERADMIN = {
  id: "sa1",
  name: "Супер Админ",
  username: "superadmin",
  password: "gegee0011",
  phone: "99739959",
  authMethod: "password" as AuthMethod,
  authKey: "gegee0011",
};

// ── Helpers ───────────────────────────────────────────────────────────
function nowTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function etaTime(mins: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function newId() {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// ── Row ↔ camelCase mappers ───────────────────────────────────────────
function rowToOrder(r: any): Order {
  return {
    id: r.id,
    fromAddress: r.from_address,
    toAddress: r.to_address,
    fromDetail: r.from_detail,
    toDetail: r.to_detail,
    packageNote: r.package_note,
    price: r.price,
    distance: Number(r.distance),
    status: r.status as OrderStatus,
    createdAt: r.created_at,
    courierId: r.courier_id ?? undefined,
    courierName: r.courier_name ?? undefined,
    courierPhone: r.courier_phone ?? undefined,
    eta: r.eta ?? undefined,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerId: r.customer_id,
    assignedAt: r.assigned_at ?? undefined,
    pickedUpAt: r.picked_up_at ?? undefined,
    deliveredAt: r.delivered_at ?? undefined,
  };
}

function rowToCourier(r: any): CourierAccount {
  return {
    id: r.id,
    name: r.name,
    username: r.username,
    password: r.password,
    phone: r.phone,
    authMethod: r.auth_method,
    authKey: r.auth_key,
    vehicle: r.vehicle,
    available: r.available,
    rating: Number(r.rating),
    totalDeliveries: r.total_deliveries,
    todayDeliveries: r.today_deliveries,
    createdAt: r.created_at,
    active: r.active,
  };
}

function rowToOperator(r: any): OperatorAccount {
  return {
    id: r.id,
    name: r.name,
    username: r.username,
    password: r.password,
    phone: r.phone,
    authMethod: r.auth_method,
    authKey: r.auth_key,
    createdAt: r.created_at,
    active: r.active,
  };
}

// ── Main store hook ───────────────────────────────────────────────────
export function useStore() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [operatorAccounts, setOperatorAccounts] = useState<OperatorAccount[]>([]);
  const [courierAccounts, setCourierAccounts] = useState<CourierAccount[]>([]);
  const [customerAccounts] = useState<CustomerAccount[]>([]);

  // ── Initial load + realtime subscriptions ──────────────────────────
  const refreshOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("inserted_at", { ascending: false });
    if (data) setOrders(data.map(rowToOrder));
  }, []);

  const refreshCouriers = useCallback(async () => {
    const { data } = await supabase
      .from("couriers")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setCourierAccounts(data.map(rowToCourier));
  }, []);

  const refreshOperators = useCallback(async () => {
    const { data } = await supabase
      .from("operators")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setOperatorAccounts(data.map(rowToOperator));
  }, []);

  useEffect(() => {
    refreshOrders();
    refreshCouriers();
    refreshOperators();

    const ordersChannel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        refreshOrders();
      })
      .subscribe();

    const couriersChannel = supabase
      .channel("couriers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "couriers" }, () => {
        refreshCouriers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(couriersChannel);
    };
  }, [refreshOrders, refreshCouriers, refreshOperators]);

  // ── Couriers view-model (зөвхөн active) ─────────────────────────────
  const couriers: CourierUser[] = courierAccounts
    .filter((c) => c.active)
    .map(({ id, name, phone, vehicle, available, rating, totalDeliveries, todayDeliveries }) => ({
      id,
      name,
      phone,
      vehicle,
      available,
      rating,
      totalDeliveries,
      todayDeliveries,
    }));

  // ── Phone-based auth lookup (DB) ────────────────────────────────────
  const resolveByPhone = useCallback(async (rawPhone: string): Promise<AccountLookup | null> => {
    const phone = rawPhone.replace(/\D/g, "");

    if (phone === SUPERADMIN.phone.replace(/\D/g, ""))
      return { role: "superadmin", id: SUPERADMIN.id, name: SUPERADMIN.name, authMethod: "password", authKey: SUPERADMIN.password };

    const { data: ops } = await supabase.from("operators").select("*").eq("phone", phone).eq("active", true).limit(1);
    if (ops && ops.length) {
      const o = ops[0];
      return { role: "operator", id: o.id, name: o.name, authMethod: o.auth_method, authKey: o.auth_key };
    }

    const { data: crs } = await supabase.from("couriers").select("*").eq("phone", phone).eq("active", true).limit(1);
    if (crs && crs.length) {
      const c = crs[0];
      return { role: "courier", id: c.id, name: c.name, authMethod: c.auth_method, authKey: c.auth_key };
    }

    const { data: cus } = await supabase.from("customers").select("*").eq("phone", phone).limit(1);
    if (cus && cus.length) {
      const c = cus[0];
      return { role: "customer", id: c.id, name: c.name, authMethod: c.auth_method, authKey: c.auth_key };
    }

    return null;
  }, []);

  // ── Customer registration ──────────────────────────────────────────
  const addCustomer = useCallback(
    async (data: { name: string; phone: string; authMethod: "pin" | "pattern"; authKey: string }): Promise<string> => {
      const id = "cu-" + newId();
      const { error } = await supabase.from("customers").insert({
        id,
        name: data.name,
        phone: data.phone,
        auth_method: data.authMethod,
        auth_key: data.authKey,
        created_at: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      return id;
    },
    [],
  );

  // ── Orders ──────────────────────────────────────────────────────────
  const addOrder = useCallback(
    async (order: Omit<Order, "id" | "createdAt" | "status">): Promise<string> => {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          from_address: order.fromAddress,
          to_address: order.toAddress,
          from_detail: order.fromDetail,
          to_detail: order.toDetail,
          package_note: order.packageNote,
          price: order.price,
          distance: order.distance,
          status: "шинэ",
          created_at: nowTime(),
          courier_id: order.courierId ?? null,
          courier_name: order.courierName ?? null,
          courier_phone: order.courierPhone ?? null,
          eta: order.eta ?? null,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          customer_id: order.customerId,
        })
        .select("id")
        .single();
      if (error) throw error;
      await refreshOrders();
      return data!.id;
    },
    [refreshOrders],
  );

  const assignCourier = useCallback(
    async (orderId: string, courierId: string, price?: number) => {
      const cr = courierAccounts.find((c) => c.id === courierId);
      if (!cr) return;
      await supabase.from("couriers").update({ available: false }).eq("id", courierId);
      const patch: any = {
        status: "томилогдсон",
        courier_id: courierId,
        courier_name: cr.name,
        courier_phone: cr.phone,
        eta: etaTime(30),
        assigned_at: nowTime(),
      };
      if (price != null) patch.price = Math.max(5000, Math.round(price));
      await supabase.from("orders").update(patch).eq("id", orderId);
      await Promise.all([refreshOrders(), refreshCouriers()]);
    },
    [courierAccounts, refreshOrders, refreshCouriers],
  );

  const courierUpdateStatus = useCallback(
    async (orderId: string, status: "авсан" | "хүргэгдсэн") => {
      const order = orders.find((o) => o.id === orderId);
      if (status === "авсан") {
        await supabase.from("orders").update({ status, picked_up_at: nowTime(), eta: etaTime(20) }).eq("id", orderId);
      } else {
        await supabase.from("orders").update({ status, delivered_at: nowTime() }).eq("id", orderId);
        if (order?.courierId) {
          const cr = courierAccounts.find((c) => c.id === order.courierId);
          if (cr) {
            await supabase
              .from("couriers")
              .update({ available: true, today_deliveries: cr.todayDeliveries + 1 })
              .eq("id", cr.id);
          }
        }
      }
      await Promise.all([refreshOrders(), refreshCouriers()]);
    },
    [orders, courierAccounts, refreshOrders, refreshCouriers],
  );

  // ── Auth: update PIN/Pattern after first login ─────────────────────
  const updateAccountAuth = useCallback(
    async (role: "operator" | "courier", id: string, authMethod: "pin" | "pattern", authKey: string) => {
      const table = role === "operator" ? "operators" : "couriers";
      await supabase.from(table).update({ auth_method: authMethod, auth_key: authKey }).eq("id", id);
      if (role === "operator") await refreshOperators();
      else await refreshCouriers();
    },
    [refreshOperators, refreshCouriers],
  );

  // ── Auth: customer changes PIN/Pattern in settings ─────────────────
  const updateCustomerAuth = useCallback(
    async (id: string, authMethod: "pin" | "pattern", authKey: string) => {
      await supabase.from("customers").update({ auth_method: authMethod, auth_key: authKey }).eq("id", id);
    },
    [],
  );

  // ── Superadmin: operator CRUD ───────────────────────────────────────
  const addOperator = useCallback(
    async (data: { name: string; username: string; password: string; phone: string }) => {
      await supabase.from("operators").insert({
        id: newId(),
        name: data.name,
        username: data.username,
        password: data.password,
        phone: data.phone,
        auth_method: "password",
        auth_key: data.password,
        created_at: new Date().toISOString().slice(0, 10),
        active: true,
      });
      await refreshOperators();
    },
    [refreshOperators],
  );

  const updateOperator = useCallback(
    async (id: string, data: Partial<Omit<OperatorAccount, "id">>) => {
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.username !== undefined) patch.username = data.username;
      if (data.password !== undefined) {
        patch.password = data.password;
        patch.auth_key = data.password;
        patch.auth_method = "password";
      }
      if (data.phone !== undefined) patch.phone = data.phone;
      if (data.active !== undefined) patch.active = data.active;
      await supabase.from("operators").update(patch).eq("id", id);
      await refreshOperators();
    },
    [refreshOperators],
  );

  const deleteOperator = useCallback(
    async (id: string) => {
      await supabase.from("operators").delete().eq("id", id);
      await refreshOperators();
    },
    [refreshOperators],
  );

  // ── Superadmin: courier CRUD ────────────────────────────────────────
  const addCourier = useCallback(
    async (data: { name: string; username: string; password: string; phone: string; vehicle: CourierAccount["vehicle"] }) => {
      await supabase.from("couriers").insert({
        id: newId(),
        name: data.name,
        username: data.username,
        password: data.password,
        phone: data.phone,
        auth_method: "password",
        auth_key: data.password,
        vehicle: data.vehicle,
        available: true,
        rating: 5.0,
        total_deliveries: 0,
        today_deliveries: 0,
        created_at: new Date().toISOString().slice(0, 10),
        active: true,
      });
      await refreshCouriers();
    },
    [refreshCouriers],
  );

  const updateCourier = useCallback(
    async (id: string, data: Partial<Omit<CourierAccount, "id">>) => {
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.username !== undefined) patch.username = data.username;
      if (data.password !== undefined) {
        patch.password = data.password;
        patch.auth_key = data.password;
        patch.auth_method = "password";
      }
      if (data.phone !== undefined) patch.phone = data.phone;
      if (data.vehicle !== undefined) patch.vehicle = data.vehicle;
      if (data.available !== undefined) patch.available = data.available;
      if (data.rating !== undefined) patch.rating = data.rating;
      if (data.totalDeliveries !== undefined) patch.total_deliveries = data.totalDeliveries;
      if (data.todayDeliveries !== undefined) patch.today_deliveries = data.todayDeliveries;
      if (data.active !== undefined) patch.active = data.active;
      await supabase.from("couriers").update(patch).eq("id", id);
      await refreshCouriers();
    },
    [refreshCouriers],
  );

  const deleteCourier = useCallback(
    async (id: string) => {
      await supabase.from("couriers").delete().eq("id", id);
      await refreshCouriers();
    },
    [refreshCouriers],
  );

  return {
    orders,
    couriers,
    operatorAccounts,
    courierAccounts,
    customerAccounts,
    addOrder,
    assignCourier,
    courierUpdateStatus,
    addOperator,
    updateOperator,
    deleteOperator,
    addCourier,
    updateCourier,
    deleteCourier,
    resolveByPhone,
    addCustomer,
    updateAccountAuth,
    updateCustomerAuth,
  };
}
