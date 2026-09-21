import { useState, useCallback, useEffect } from "react";
import type { Order, OrderStatus, CourierUser, CourierDocs, PartnerProduct, OrderRating, BasketItem } from "./types";
import type { Partner, PartnerCategory } from "../customer/partners";
import { supabase } from "../../lib/supabase";
import { normalizePhone } from "../../lib/phone";

export interface FeedbackRow {
  id: string;
  orderId?: string;
  phone: string;
  message: string;
  createdAt: string;
  handled: boolean;
}

/** createPayment-ийн буцаалт */
export interface PaymentIntent {
  provider: string;
  manual: boolean;
  qrText?: string;
  qrImage?: string;
  checkoutUrl?: string;
}

// ── Auth method types ─────────────────────────────────────────────────
export type AuthMethod = "pin" | "pattern" | "password" | "reset";

export interface AccountLookup {
  role: "customer" | "operator" | "courier" | "superadmin" | "partner";
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
  // Migration 12 — баримт бичиг
  photoUrl?: string;
  licensePhotoUrl?: string;
  licenseNo?: string;
  licenseClass?: string;
  licenseExpiry?: string;
  carPhotoUrl?: string;
  plate?: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  authMethod: "pin" | "pattern" | "reset";
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

/** Migration ажиллуулаагүйгээс багана олдохгүй байгаа алдаа эсэх */
function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || /column .* does not exist|Could not find the/i.test(error.message ?? "");
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
    serviceId: r.service_id ?? undefined,
    subServiceId: r.sub_service_id ?? undefined,
    cargoPhotoUrl: r.cargo_photo_url ?? undefined,
    weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
    fragile: r.fragile ?? false,
    urgent: r.urgent ?? false,
    paymentStatus: r.payment_status ?? "хүлээгдэж байна",
    paymentMethod: r.payment_method ?? undefined,
    paidAt: r.paid_at ?? undefined,
    basket: Array.isArray(r.basket) ? (r.basket as BasketItem[]) : [],
    basketTotal: r.basket_total ?? 0,
    partnerId: r.partner_id ?? undefined,
    price: r.price,
    distance: Number(r.distance),
    status: r.status as OrderStatus,
    createdAt: r.created_at,
    insertedAt: r.inserted_at ?? undefined,
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
    available: r.available ?? true,
    rating: Number(r.rating),
    totalDeliveries: r.total_deliveries,
    todayDeliveries: r.today_deliveries,
    createdAt: r.created_at,
    active: r.active ?? true,
    photoUrl: r.photo_url ?? undefined,
    licensePhotoUrl: r.license_photo_url ?? undefined,
    licenseNo: r.license_no ?? undefined,
    licenseClass: r.license_class ?? undefined,
    licenseExpiry: r.license_expiry ?? undefined,
    carPhotoUrl: r.car_photo_url ?? undefined,
    plate: r.plate ?? undefined,
    verified: r.verified ?? false,
    verifiedAt: r.verified_at ?? undefined,
  };
}

function rowToProduct(r: any): PartnerProduct {
  return {
    id: r.id,
    partnerId: r.partner_id,
    name: r.name,
    price: r.price,
    unit: r.unit ?? "ш",
    imageUrl: r.image_url ?? undefined,
    inStock: r.in_stock ?? true,
    sort: r.sort ?? 0,
  };
}

function rowToRating(r: any): OrderRating {
  return {
    orderId: r.order_id,
    courierId: r.courier_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    score: r.score,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToPartner(r: any): Partner {
  return {
    id: r.id,
    name: r.name,
    category: r.category as PartnerCategory,
    emoji: r.emoji,
    address: r.address,
    detail: r.detail ?? "",
    area: r.area ?? "",
    image: r.image ?? undefined,
    phone: r.phone ?? undefined,
    paymentQrUrl: r.payment_qr_url ?? undefined,
  };
}

function rowToCustomer(r: any): CustomerAccount {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    authMethod: r.auth_method,
    authKey: r.auth_key,
    createdAt: r.created_at,
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
    active: r.active ?? true,
  };
}

// ── Main store hook ───────────────────────────────────────────────────
export function useStore() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [operatorAccounts, setOperatorAccounts] = useState<OperatorAccount[]>([]);
  const [courierAccounts, setCourierAccounts] = useState<CourierAccount[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [ratings, setRatings] = useState<OrderRating[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [bankInfo, setBankInfo] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  const refreshCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, auth_method, auth_key, created_at")
      .order("created_at", { ascending: false });
    if (data) setCustomerAccounts(data.map(rowToCustomer));
  }, []);

  const refreshPartners = useCallback(async () => {
    const { data } = await supabase
      .from("partners")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });
    if (data) setPartners(data.map(rowToPartner));
  }, []);

  const refreshProducts = useCallback(async () => {
    const { data } = await supabase
      .from("partner_products")
      .select("*")
      .order("sort", { ascending: true });
    if (data) setProducts(data.map(rowToProduct));
  }, []);

  const refreshRatings = useCallback(async () => {
    const { data } = await supabase
      .from("order_ratings")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRatings(data.map(rowToRating));
  }, []);

  const refreshFeedback = useCallback(async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setFeedback(
        data.map((r: any) => ({
          id: r.id,
          orderId: r.order_id ?? undefined,
          phone: r.phone,
          message: r.message,
          createdAt: r.created_at,
          handled: r.handled ?? false,
        })),
      );
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "bank_info").single();
    if (data) setBankInfo(data.value ?? "");
  }, []);

  useEffect(() => {
    Promise.all([refreshOrders(), refreshCouriers(), refreshOperators(), refreshCustomers(), refreshPartners(), refreshProducts(), refreshRatings(), refreshFeedback(), refreshSettings()]).finally(() => setLoading(false));

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

    const partnersChannel = supabase
      .channel("partners-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" }, () => {
        refreshPartners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(couriersChannel);
      supabase.removeChannel(partnersChannel);
    };
  }, [refreshOrders, refreshCouriers, refreshOperators, refreshCustomers, refreshPartners, refreshProducts, refreshRatings, refreshFeedback, refreshSettings]);

  // ── Couriers view-model (зөвхөн active) ─────────────────────────────
  const couriers: CourierUser[] = courierAccounts
    .filter((c) => c.active)
    .map(({ id, name, phone, vehicle, available, rating, totalDeliveries, todayDeliveries, verified }) => ({
      id,
      name,
      phone,
      vehicle,
      available,
      rating,
      totalDeliveries,
      todayDeliveries,
      verified,
    }));

  // ── Phone-based auth lookup (DB) ────────────────────────────────────
  // Сүлжээ тасрах/Supabase түр нойрсох үед алдаа "бүртгэлгүй" гэж
  // андуураад дахин бүртгүүлэх шаардлагатай мэт харагдахаас сэргийлж,
  // алдааг зааж throw хийнэ — LoginPage үүнийг "олдсонгүй"-гээс ялгаж харна.
  const resolveByPhone = useCallback(async (rawPhone: string): Promise<AccountLookup | null> => {
    const phone = normalizePhone(rawPhone);

    if (phone === normalizePhone(SUPERADMIN.phone))
      return { role: "superadmin", id: SUPERADMIN.id, name: SUPERADMIN.name, authMethod: "password", authKey: SUPERADMIN.password };

    const { data: ops, error: opsErr } = await supabase.from("operators").select("*").eq("phone", phone).eq("active", true).limit(1);
    if (opsErr) throw opsErr;
    if (ops && ops.length) {
      const o = ops[0];
      return { role: "operator", id: o.id, name: o.name, authMethod: o.auth_method, authKey: o.auth_key };
    }

    const { data: crs, error: crsErr } = await supabase.from("couriers").select("*").eq("phone", phone).eq("active", true).limit(1);
    if (crsErr) throw crsErr;
    if (crs && crs.length) {
      const c = crs[0];
      return { role: "courier", id: c.id, name: c.name, authMethod: c.auth_method, authKey: c.auth_key };
    }

    const { data: prt, error: prtErr } = await supabase.from("partners").select("*").eq("phone", phone).eq("active", true).limit(1);
    if (prtErr && !isMissingColumn(prtErr)) throw prtErr;
    if (prt && prt.length && prt[0].auth_key) {
      const pr = prt[0];
      return { role: "partner", id: pr.id, name: pr.name, authMethod: pr.auth_method ?? "password", authKey: pr.auth_key };
    }

    const { data: cus, error: cusErr } = await supabase.from("customers").select("*").eq("phone", phone).limit(1);
    if (cusErr) throw cusErr;
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
        phone: normalizePhone(data.phone),
        auth_method: data.authMethod,
        auth_key: data.authKey,
        created_at: new Date().toISOString().slice(0, 10),
      });
      if (error) {
        // 23505 = unique_violation (энэ дугаар өөр төхөөрөмжөөс аль хэдийн бүртгүүлсэн байж болно)
        if ((error as { code?: string }).code === "23505") {
          throw new Error("Энэ дугаар аль хэдийн бүртгэлтэй байна. Нэвтэрч орно уу.");
        }
        throw error;
      }
      return id;
    },
    [],
  );

  // ── Orders ──────────────────────────────────────────────────────────
  //
  // Захиалгын урсгал:
  //   шинэ → үнэ батлах (оператор үнэ тогтоов)
  //        → төлбөр хүлээж байна (үйлчлүүлэгч үнийг зөвшөөрөв)
  //        → жолооч хайж байна (төлбөр орлоо)
  //        → томилогдсон → авсан → хүргэгдсэн
  //
  const addOrder = useCallback(
    async (order: Omit<Order, "id" | "createdAt" | "status">): Promise<string> => {
      // Migration 11-13, 17 ажиллуулаагүй DB дээр ч захиалга үүсэх ёстой тул
      // шинэ баганууд тусад нь, алдаа гарвал хасагдана.
      const base = {
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
      };
      const extra = {
        service_id: order.serviceId ?? null,
        sub_service_id: order.subServiceId ?? null,
        cargo_photo_url: order.cargoPhotoUrl ?? null,
        weight_kg: order.weightKg ?? null,
        fragile: order.fragile ?? false,
        urgent: order.urgent ?? false,
        basket: order.basket ?? [],
        basket_total: order.basketTotal ?? 0,
        partner_id: order.partnerId ?? null,
      };
      let { data, error } = await supabase.from("orders").insert({ ...base, ...extra }).select("id").single();
      if (error && isMissingColumn(error)) {
        ({ data, error } = await supabase.from("orders").insert(base).select("id").single());
      }
      if (error) throw error;
      await refreshOrders();
      return data!.id;
    },
    [refreshOrders],
  );

  /** Оператор үнэ тогтоов — жолооч хараахан томилогдоогүй */
  const operatorSetPrice = useCallback(
    async (orderId: string, price: number) => {
      await supabase
        .from("orders")
        .update({ status: "үнэ батлах", price: Math.max(5000, Math.round(price)) })
        .eq("id", orderId);
      await refreshOrders();
    },
    [refreshOrders],
  );

  /** Үйлчлүүлэгч үнийг зөвшөөрөв → төлбөр хүлээнэ */
  const confirmOrder = useCallback(
    async (orderId: string) => {
      await supabase.from("orders").update({ status: "төлбөр хүлээж байна" }).eq("id", orderId);
      await refreshOrders();
    },
    [refreshOrders],
  );

  /**
   * Төлбөр баталгаажлаа → жолооч хайж эхэлнэ.
   * Жинхэнэ төлбөрийг payment-webhook Edge Function баталгаажуулж энэ
   * талбаруудыг шинэчилнэ; энд аппын талын төлөвийг зөөнө.
   */
  const markOrderPaid = useCallback(
    async (orderId: string, method: string) => {
      await supabase
        .from("orders")
        .update({
          status: "жолооч хайж байна",
          payment_status: "төлөгдсөн",
          payment_method: method,
          paid_at: nowTime(),
        })
        .eq("id", orderId);
      await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("order_id", orderId).eq("status", "pending");
      await refreshOrders();
    },
    [refreshOrders],
  );

  /** Төлбөр орсны дараа оператор жолооч хуваарилна */
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

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (order?.courierId) {
        await supabase.from("couriers").update({ available: true }).eq("id", order.courierId);
      }
      await supabase.from("orders").update({ status: "цуцлагдсан", courier_id: null, courier_name: null, courier_phone: null, eta: null }).eq("id", orderId);
      await Promise.all([refreshOrders(), refreshCouriers()]);
    },
    [orders, refreshOrders, refreshCouriers],
  );

  const updateBankInfo = useCallback(
    async (value: string) => {
      await supabase.from("settings").upsert({ key: "bank_info", value });
      setBankInfo(value);
    },
    [],
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
              .update({ available: true, today_deliveries: cr.todayDeliveries + 1, total_deliveries: cr.totalDeliveries + 1 })
              .eq("id", cr.id);
          }
        }
      }
      await Promise.all([refreshOrders(), refreshCouriers()]);
    },
    [orders, courierAccounts, refreshOrders, refreshCouriers],
  );

  // ── Төлбөр ──────────────────────────────────────────────────────────
  /**
   * Нэхэмжлэх үүсгэнэ. VITE_PAYMENT_PROVIDER тохируулсан бол
   * create-payment Edge Function QR-ыг буцаана; тохируулаагүй үед гарын
   * авлагын горимд шилжиж, оператор төлбөрийг баталгаажуулна.
   */
  const createPayment = useCallback(
    async (orderId: string, amount: number): Promise<PaymentIntent> => {
      const provider = (import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined)?.trim();

      if (provider) {
        try {
          const { data, error } = await supabase.functions.invoke("create-payment", {
            body: { orderId, amount, provider },
          });
          if (error) throw error;
          await refreshOrders();
          return {
            provider,
            manual: false,
            qrText: data?.qrText,
            qrImage: data?.qrImage,
            checkoutUrl: data?.checkoutUrl,
          };
        } catch {
          // Edge Function бэлэн биш — гарын авлагын горимд шилжинэ
        }
      }

      // Нэг захиалгад нэг л хүлээгдэж буй нэхэмжлэх байлгана
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "pending")
        .limit(1);
      if (!existing?.length) {
        await supabase.from("payments").insert({
          id: "pay-" + newId(),
          order_id: orderId,
          provider: provider ?? "manual",
          amount,
          status: "pending",
          created_at: new Date().toISOString(),
        });
      }
      return { provider: provider ?? "manual", manual: true };
    },
    [refreshOrders],
  );

  // ── Үнэлгээ ─────────────────────────────────────────────────────────
  const rateOrder = useCallback(
    async (orderId: string, score: number, comment?: string) => {
      const order = orders.find((o) => o.id === orderId);
      await supabase.from("order_ratings").upsert({
        order_id: orderId,
        courier_id: order?.courierId ?? null,
        customer_id: order?.customerId ?? null,
        score: Math.min(5, Math.max(1, Math.round(score))),
        comment: comment?.trim() || null,
        created_at: new Date().toISOString(),
      });
      await Promise.all([refreshRatings(), refreshCouriers()]);
    },
    [orders, refreshRatings, refreshCouriers],
  );

  // ── Санал хүсэлт ────────────────────────────────────────────────────
  const submitFeedback = useCallback(
    async (data: { phone: string; message: string; orderId?: string }) => {
      const id = "fb-" + newId();
      const { error } = await supabase.from("feedback").insert({
        id,
        order_id: data.orderId ?? null,
        phone: normalizePhone(data.phone),
        message: data.message.trim(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      // И-мэйл рүү дамжуулах нь сонголттой — функц тохируулаагүй бол чимээгүй өнгөрнө
      try {
        await supabase.functions.invoke("send-feedback-email", { body: { id, ...data } });
      } catch {
        /* send-feedback-email тохируулаагүй байна */
      }
      await refreshFeedback();
    },
    [refreshFeedback],
  );

  const setFeedbackHandled = useCallback(
    async (id: string, handled: boolean) => {
      await supabase.from("feedback").update({ handled }).eq("id", id);
      await refreshFeedback();
    },
    [refreshFeedback],
  );

  // ── Auth: update PIN/Pattern after first login ─────────────────────
  const updateAccountAuth = useCallback(
    async (role: "operator" | "courier", id: string, authMethod: "pin" | "pattern", authKey: string) => {
      const table = role === "operator" ? "operators" : "couriers";
      await supabase.from(table).update({ auth_method: authMethod, auth_key: authKey, active: true }).eq("id", id);
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

  // ── Superadmin: PIN/Pattern мартсан хэрэглэгчийн нууцлалыг цэвэрлэх ─
  // Дараагийн нэвтрэлт дээр (утсаар баталгаажуулсны дараа) хэрэглэгч
  // шинэ PIN/Pattern-аа шууд тохируулна — нэмэлт баталгаажуулалт шаардахгүй,
  // учир нь admin аль хэдийн утсаар хэрэглэгчийг таньсан байна.
  const resetCustomerAuth = useCallback(
    async (id: string) => {
      await supabase.from("customers").update({ auth_method: "reset", auth_key: "" }).eq("id", id);
      await refreshCustomers();
    },
    [refreshCustomers],
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

  // ── Жолоочийн баримт бичиг (migration 12) ──────────────────────────
  /** Жолооч өөрөө бүртгүүлнэ — супер админ баталгаажуулах хүртэл захиалга авахгүй */
  const registerCourier = useCallback(
    async (data: {
      name: string;
      phone: string;
      vehicle: CourierAccount["vehicle"];
      authMethod: "pin" | "pattern";
      authKey: string;
    }): Promise<string> => {
      const id = "cr-" + newId();
      const { error } = await supabase.from("couriers").insert({
        id,
        name: data.name,
        username: normalizePhone(data.phone),
        password: data.authKey,
        phone: normalizePhone(data.phone),
        auth_method: data.authMethod,
        auth_key: data.authKey,
        vehicle: data.vehicle,
        available: false,
        rating: 5.0,
        total_deliveries: 0,
        today_deliveries: 0,
        created_at: new Date().toISOString().slice(0, 10),
        active: true,
        verified: false,
      });
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("Энэ дугаар аль хэдийн бүртгэлтэй байна. Нэвтэрч орно уу.");
        }
        throw error;
      }
      await refreshCouriers();
      return id;
    },
    [refreshCouriers],
  );

  /** Жолооч өөрийн баримт бичгээ оруулах/солих */
  const updateCourierDocs = useCallback(
    async (id: string, docs: CourierDocs) => {
      const patch: any = {};
      if (docs.photoUrl !== undefined) patch.photo_url = docs.photoUrl;
      if (docs.licensePhotoUrl !== undefined) patch.license_photo_url = docs.licensePhotoUrl;
      if (docs.licenseNo !== undefined) patch.license_no = docs.licenseNo;
      if (docs.licenseClass !== undefined) patch.license_class = docs.licenseClass;
      if (docs.licenseExpiry !== undefined) patch.license_expiry = docs.licenseExpiry;
      if (docs.carPhotoUrl !== undefined) patch.car_photo_url = docs.carPhotoUrl;
      if (docs.plate !== undefined) patch.plate = docs.plate;
      const { error } = await supabase.from("couriers").update(patch).eq("id", id);
      if (error) throw error;
      await refreshCouriers();
    },
    [refreshCouriers],
  );

  /** Супер админ баримтыг шалгаад баталгаажуулна */
  const verifyCourier = useCallback(
    async (id: string, verified: boolean) => {
      await supabase
        .from("couriers")
        .update({ verified, verified_at: verified ? new Date().toISOString().slice(0, 10) : null })
        .eq("id", id);
      await refreshCouriers();
    },
    [refreshCouriers],
  );

  // ── Партнёрын бараа (migration 17) ──────────────────────────────────
  const addProduct = useCallback(
    async (data: Omit<PartnerProduct, "id">) => {
      const { error } = await supabase.from("partner_products").insert({
        id: "pp-" + newId(),
        partner_id: data.partnerId,
        name: data.name,
        price: data.price,
        unit: data.unit,
        image_url: data.imageUrl ?? null,
        in_stock: data.inStock,
        sort: data.sort,
        created_at: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      await refreshProducts();
    },
    [refreshProducts],
  );

  const updateProduct = useCallback(
    async (id: string, data: Partial<Omit<PartnerProduct, "id" | "partnerId">>) => {
      const patch: any = {};
      if (data.name !== undefined) patch.name = data.name;
      if (data.price !== undefined) patch.price = data.price;
      if (data.unit !== undefined) patch.unit = data.unit;
      if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
      if (data.inStock !== undefined) patch.in_stock = data.inStock;
      if (data.sort !== undefined) patch.sort = data.sort;
      await supabase.from("partner_products").update(patch).eq("id", id);
      await refreshProducts();
    },
    [refreshProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await supabase.from("partner_products").delete().eq("id", id);
      await refreshProducts();
    },
    [refreshProducts],
  );

  /** Партнёрын нэвтрэх эрх + газартаа төлөх QR */
  const updatePartnerAccess = useCallback(
    async (id: string, data: { phone?: string; authKey?: string; paymentQrUrl?: string }) => {
      const patch: any = {};
      if (data.phone !== undefined) patch.phone = normalizePhone(data.phone);
      if (data.authKey !== undefined) {
        patch.auth_key = data.authKey;
        patch.auth_method = "password";
      }
      if (data.paymentQrUrl !== undefined) patch.payment_qr_url = data.paymentQrUrl;
      const { error } = await supabase.from("partners").update(patch).eq("id", id);
      if (error) throw error;
      await refreshPartners();
    },
    [refreshPartners],
  );

  // ── Superadmin: partner CRUD ────────────────────────────────────────
  const addPartner = useCallback(
    async (data: Omit<Partner, "id">) => {
      await supabase.from("partners").insert({
        id: "p-" + newId(),
        name: data.name,
        category: data.category,
        emoji: data.emoji,
        address: data.address,
        detail: data.detail,
        area: data.area,
        active: true,
        created_at: new Date().toISOString().slice(0, 10),
      });
      await refreshPartners();
    },
    [refreshPartners],
  );

  const updatePartner = useCallback(
    async (id: string, data: Partial<Omit<Partner, "id">>) => {
      await supabase.from("partners").update(data).eq("id", id);
      await refreshPartners();
    },
    [refreshPartners],
  );

  const deletePartner = useCallback(
    async (id: string) => {
      await supabase.from("partners").delete().eq("id", id);
      await refreshPartners();
    },
    [refreshPartners],
  );

  return {
    orders,
    couriers,
    partners,
    products,
    ratings,
    feedback,
    bankInfo,
    loading,
    operatorAccounts,
    courierAccounts,
    customerAccounts,
    addOrder,
    operatorSetPrice,
    assignCourier,
    confirmOrder,
    markOrderPaid,
    createPayment,
    cancelOrder,
    courierUpdateStatus,
    rateOrder,
    submitFeedback,
    setFeedbackHandled,
    registerCourier,
    updateCourierDocs,
    verifyCourier,
    addProduct,
    updateProduct,
    deleteProduct,
    updatePartnerAccess,
    updateBankInfo,
    addOperator,
    updateOperator,
    deleteOperator,
    addCourier,
    updateCourier,
    deleteCourier,
    addPartner,
    updatePartner,
    deletePartner,
    resolveByPhone,
    addCustomer,
    updateAccountAuth,
    updateCustomerAuth,
    resetCustomerAuth,
  };
}
