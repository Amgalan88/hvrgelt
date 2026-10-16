// hvrgelt — Push мэдэгдэл (Vercel Function). Push хийхэд автоматаар deploy болно.
//
//   POST /api/notify   { event: "courier-docs", courierId }
//     Хүргэгч баримтаа бүрэн оруулмагц апп дуудна. Сервер DB-ээс өөрөө
//     шалгаад супер админуудад "Шинэ хүргэгч шалгалт хүлээж байна" илгээнэ.
//
//   POST /api/notify?source=db   (Supabase Database Webhook, orders: Insert + Update)
//     Header: x-webhook-secret = WEBHOOK_SECRET
//     • шинэ захиалга          → операторуудад
//     • төлбөр орж хүргэгч хайж эхэлмэгц → ойрын 4 хүргэгчид санал
//     • хүргэгч томилогдоход    → тухайн хүргэгчид
//     • статус өөрчлөгдөхөд     → захиалагчид
//
// Vercel → Environment Variables (VITE_ угтваргүй, нууц):
//   VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET
//   (нээлттэй түлхүүрийг VITE_VAPID_PUBLIC_KEY-ээс уншина; VAPID_SUBJECT заавал биш)
// Тохируулаагүй бол 501 — апп ердийнхөөрөө ажиллана.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

const env = (k: string) => process.env[k]?.trim() || "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function db(): SupabaseClient | null {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function vapidReady(): boolean {
  const pub = env("VAPID_PUBLIC_KEY") || env("VITE_VAPID_PUBLIC_KEY");
  const priv = env("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return false;
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:info@hvrgelt.mn", pub, priv);
  return true;
}

/** Тогтмол хугацаат харьцуулалт — нууц үгийг тааж олохоос сэргийлнэ */
function sameSecret(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** role-ын бүх (эсвэл userIds-ийн) бүртгэлтэй төхөөрөмж рүү илгээнэ */
async function sendTo(supabase: SupabaseClient, role: string, userIds: string[] | null, payload: object): Promise<number> {
  if (userIds && userIds.length === 0) return 0;
  let q = supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("role", role);
  if (userIds) q = q.in("user_id", userIds);
  const { data: subs } = await q;
  const list = (subs ?? []) as Sub[];
  const body = JSON.stringify(payload);
  await Promise.all(
    list.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      } catch (err) {
        // 404/410 — subscription устсан → цэвэрлэнэ
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return list.length;
}

// ── Шинэ хүргэгч ───────────────────────────────────────────────────────

/**
 * Заавал баримт бүрэн эсэх — src/app/lib/vehicles.ts docItems()-тэй ижил дүрэм.
 * (Vercel функц src/ доторх файлыг импортлоход ESM замын асуудал гардаг тул энд давтав.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docsComplete(c: any): boolean {
  const has = (k: string) => !!String(c[k] ?? "").trim();
  const motorized = c.vehicle === "мопед" || c.vehicle === "мотоцикл" || c.vehicle === "автомашин";
  const strict = c.vehicle === "мотоцикл" || c.vehicle === "автомашин";
  const need = ["photo_url", "license_photo_url", ...(motorized ? ["car_photo_url"] : []), ...(strict ? ["plate", "license_no"] : [])];
  return need.every(has);
}

async function courierDocs(body: { courierId?: string }) {
  if (!body.courierId) return json({ error: "courierId шаардлагатай" }, 400);
  const supabase = db();
  if (!supabase || !vapidReady()) return json({ error: "Push тохируулаагүй" }, 501);

  const { data: c } = await supabase.from("couriers").select("*").eq("id", body.courierId).single();
  if (!c) return json({ error: "Хүргэгч олдсонгүй" }, 404);
  if (c.verified || !docsComplete(c)) return json({ ok: true, sent: 0, note: "шалгах шаардлагагүй" });

  const sent = await sendTo(supabase, "superadmin", null, {
    title: "Шинэ хүргэгч шалгалт хүлээж байна",
    body: `${c.name} (${c.vehicle}) баримтаа бүрэн оруулсан. Шалгаад баталгаажуулна уу.`,
    url: "/",
  });
  return json({ ok: true, sent });
}

// ── Захиалгын өөрчлөлт (Supabase Database Webhook) ─────────────────────

const STATUS_MESSAGES: Record<string, { title: string; body: string } | undefined> = {
  "үнэ батлах": { title: "Хүргэлтийн үнэ тогтлоо", body: "Апп дээрээ орж баталгаажуулна уу." },
  "төлбөр хүлээж байна": { title: "Төлбөр хүлээгдэж байна", body: "Төлбөрөө төлснөөр хүргэгч хуваарилагдана." },
  "жолооч хайж байна": { title: "Төлбөр амжилттай ✅", body: "Ойр байгаа хүргэгчдэд санал илгээлээ — эхэлж зөвшөөрсөн нь ирнэ." },
  "томилогдсон": { title: "Хүргэгч томилогдлоо", body: "Таны захиалгыг хүргэгч удахгүй авах болно." },
  "авсан": { title: "Ачаа авлаа", body: "Хүргэгч ачааг авлаа. Удахгүй хүргэнэ." },
  "хүргэгдсэн": { title: "Хүргэгдлээ ✅", body: "Таны захиалга амжилттай хүргэгдлээ. Баярлалаа!" },
  "цуцлагдсан": { title: "Захиалга цуцлагдлаа", body: "Таны захиалга цуцлагдсан байна." },
};

// Ойрын хүргэгчид санал — src/app/lib/dispatch.ts-тэй ижил дүрэм
const OFFER_BATCH = 4;
const LOCATION_FRESH_MS = 10 * 60_000;
const COURIER_SHARE = 0.8;
const VEHICLE_REACH: Record<string, { pickupKm: number; tripKm: number }> = {
  явган: { pickupKm: 1.5, tripKm: 3 },
  дугуй: { pickupKm: 4, tripKm: 8 },
};

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Ажилд гарсан, баталгаажсан хүргэгчдээс авах цэгт хамгийн ойр 4-ийг сонгоно.
 * Авах цэгийн байршилгүй бол бүгдийг. Дараагийн давалгааг (2 мин тутам)
 * хүргэгчийн апп өөрөө харуулж дуут дохио өгнө.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nearestCourierIds(supabase: SupabaseClient, record: any): Promise<string[]> {
  const { data: crs } = await supabase.from("couriers").select("id, vehicle").eq("available", true).eq("active", true).eq("verified", true);
  const couriers = (crs ?? []) as { id: string; vehicle: string }[];
  if (couriers.length === 0) return [];
  const vehicleOf = new Map(couriers.map((c) => [c.id, c.vehicle]));
  const tripKm = Number(record.distance) || 0;
  const tripOk = (id: string) => {
    const r = VEHICLE_REACH[vehicleOf.get(id) ?? ""];
    return !r || !tripKm || tripKm <= r.tripKm;
  };
  const ids = couriers.map((c) => c.id);
  if (record.from_lat == null || record.from_lng == null) return ids.filter(tripOk);

  const { data: locs } = await supabase.from("courier_locations").select("courier_id, lat, lng, updated_at").in("courier_id", ids);
  const byId = new Map(((locs ?? []) as { courier_id: string; lat: number; lng: number; updated_at: string }[]).map((l) => [l.courier_id, l]));
  const now = Date.now();
  const pickup = { lat: record.from_lat, lng: record.from_lng };
  return ids
    .map((id) => {
      const l = byId.get(id);
      const fresh = !!l && now - new Date(l.updated_at).getTime() <= LOCATION_FRESH_MS;
      return { id, d: fresh ? km(pickup, { lat: l!.lat, lng: l!.lng }) : Infinity };
    })
    // Явган, дугуй хүргэгчид хол захиалга санал болгохгүй
    .filter((x) => {
      const r = VEHICLE_REACH[vehicleOf.get(x.id) ?? ""];
      return tripOk(x.id) && (!r || x.d <= r.pickupKm);
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, OFFER_BATCH)
    .map((x) => x.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function orderEvent(request: Request, payload: any) {
  const secret = env("WEBHOOK_SECRET");
  // Нууц тохируулаагүй бол хүлээж авахгүй — хэн ч хуурамч мэдэгдэл илгээхгүйн тулд
  if (!secret) return json({ error: "WEBHOOK_SECRET тохируулаагүй" }, 501);
  if (!sameSecret(request.headers.get("x-webhook-secret") ?? "", secret)) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  if (!supabase || !vapidReady()) return json({ error: "Push тохируулаагүй" }, 501);

  const record = payload?.record;
  const old = payload?.old_record;
  if (!record || payload.table !== "orders") return json({ ok: true, ignored: true });
  const route = `${record.from_address} → ${record.to_address}`;
  const base = { orderId: record.id, url: "/" };
  const sent: Record<string, number> = {};

  // Шинэ захиалга → операторууд
  if (payload.type === "INSERT") {
    sent.operator = await sendTo(supabase, "operator", null, { ...base, title: "Шинэ захиалга ирлээ", body: route });
    return json({ ok: true, sent });
  }
  if (payload.type !== "UPDATE") return json({ ok: true, ignored: payload.type });

  // Төлбөр орж хүргэгч хайж эхлэхэд → ойрын хүргэгчдэд санал
  if (record.status === "жолооч хайж байна" && old?.status !== "жолооч хайж байна" && !record.courier_id) {
    const earn = Math.round((record.price ?? 0) * COURIER_SHARE);
    sent.offer = await sendTo(supabase, "courier", await nearestCourierIds(supabase, record), {
      ...base,
      title: record.urgent ? `⚡ Яаралтай санал · ₮${earn.toLocaleString()}` : `Шинэ санал · ₮${earn.toLocaleString()}`,
      body: `${route} — эхэлж «Авах» дарсан нь авна`,
      urgent: true,
    });
  }

  // Хүргэгч томилогдсон (оператор эсвэл санал авсан) → тухайн хүргэгчид
  if (record.courier_id && record.courier_id !== old?.courier_id) {
    sent.courier = await sendTo(supabase, "courier", [record.courier_id], {
      ...base,
      title: record.urgent ? "⚡ ЯАРАЛТАЙ ачаа томилогдлоо" : "Танд шинэ ачаа томилогдлоо",
      body: route,
      urgent: true,
    });
  }

  // Статус өөрчлөгдсөн → захиалагчид
  const msg = record.status !== old?.status ? STATUS_MESSAGES[record.status] : undefined;
  if (msg && record.customer_id) sent.customer = await sendTo(supabase, "customer", [record.customer_id], { ...base, ...msg });

  return json({ ok: true, sent });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "POST шаардлагатай" }, 405);
    try {
      const body = await request.json().catch(() => ({}));
      if (new URL(request.url).searchParams.get("source") === "db") return await orderEvent(request, body);
      if (body?.event === "courier-docs") return await courierDocs(body);
      return json({ error: "unknown event" }, 404);
    } catch (err) {
      console.error("notify", err);
      return json({ error: err instanceof Error ? err.message : "Алдаа гарлаа" }, 500);
    }
  },
};
