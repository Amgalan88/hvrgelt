// hvrgelt — Захиалгын мэдээллийн push мэдэгдэл (customer/operator/courier).
// Supabase Database Webhook (orders хүснэгт, INSERT + UPDATE event) энэ
// функцийг дуудна.
//
// Deploy:
//   supabase functions deploy send-order-notification --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com WEBHOOK_SECRET=...
//
// Дараа нь Dashboard → Database → Webhooks дээр:
//   Table: orders, Events: Insert + Update (хоёуланг сонгоно), Type: HTTP Request, Method: POST
//   URL: <deploy хийхэд өгсөн function URL>
//   HTTP Headers: x-webhook-secret: <WEBHOOK_SECRET-тэй ижил утга>
//
// Дэлгэрэнгүй заавар: PUSH_NOTIFICATIONS_SETUP.md

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@hvrgelt.mn";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const STATUS_MESSAGES: Record<string, { title: string; body: string } | undefined> = {
  "үнэ батлах": { title: "Хүргэлтийн үнэ тогтлоо", body: "Апп дээрээ орж баталгаажуулна уу." },
  "төлбөр хүлээж байна": { title: "Төлбөр хүлээгдэж байна", body: "QR-аар төлбөрөө төлснөөр жолооч хуваарилагдана." },
  "жолооч хайж байна": { title: "Төлбөр амжилттай ✅", body: "Ойр байгаа хүргэгчдэд санал илгээлээ — эхэлж зөвшөөрсөн нь ирнэ." },
  "томилогдсон": { title: "Хүргэгч томилогдлоо", body: "Таны захиалгыг хүргэгч удахгүй авах болно." },
  "авсан": { title: "Ачаа авлаа", body: "Хүргэгч ачааг авлаа. Удахгүй хүргэнэ." },
  "хүргэгдсэн": { title: "Хүргэгдлээ ✅", body: "Таны захиалга амжилттай хүргэгдлээ. Баярлалаа!" },
  "цуцлагдсан": { title: "Захиалга цуцлагдлаа", body: "Таны захиалга цуцлагдсан байна." },
};

interface Sub { endpoint: string; p256dh: string; auth: string }

// ── Ойрын хүргэгчид санал (src/app/lib/dispatch.ts-тэй ижил дүрэм) ─────
const OFFER_BATCH = 4;
const LOCATION_FRESH_MS = 10 * 60_000;

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Моторгүй хүргэгчийн хүрэх зай (км) — src/app/lib/dispatch.ts VEHICLE_REACH-тэй ижил */
const VEHICLE_REACH: Record<string, { pickupKm: number; tripKm: number }> = {
  явган: { pickupKm: 1.5, tripKm: 3 },
  дугуй: { pickupKm: 4, tripKm: 8 },
};

/**
 * Ажилд гарсан, баталгаажсан хүргэгчдээс авах цэгт хамгийн ойр 4-ийг сонгоно.
 * Авах цэгийн байршилгүй бол бүгдийг. Дараагийн давалгааг (2 мин тутам)
 * хүргэгчийн апп өөрөө харуулж дуут дохио өгнө.
 */
// deno-lint-ignore no-explicit-any
async function nearestCourierIds(record: any): Promise<string[]> {
  const { data: crs } = await supabase.from("couriers").select("id, vehicle").eq("available", true).eq("active", true).eq("verified", true);
  const vehicleOf = new Map((crs ?? []).map((c: { id: string; vehicle: string }) => [c.id, c.vehicle]));
  const ids = (crs ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return [];
  const tripKm = Number(record.distance) || 0;
  if (record.from_lat == null || record.from_lng == null) {
    return ids.filter((id: string) => {
      const r = VEHICLE_REACH[vehicleOf.get(id) ?? ""];
      return !r || !tripKm || tripKm <= r.tripKm;
    });
  }
  const { data: locs } = await supabase.from("courier_locations").select("*").in("courier_id", ids);
  const now = Date.now();
  const pickup = { lat: record.from_lat, lng: record.from_lng };
  const byId = new Map((locs ?? []).map((l: { courier_id: string }) => [l.courier_id, l]));
  return ids
    // deno-lint-ignore no-explicit-any
    .map((id: string) => {
      // deno-lint-ignore no-explicit-any
      const l: any = byId.get(id);
      const fresh = l && now - new Date(l.updated_at).getTime() <= LOCATION_FRESH_MS;
      return { id, d: fresh ? km(pickup, { lat: l.lat, lng: l.lng }) : Infinity };
    })
    // Явган, дугуй хүргэгчид хол захиалга санал болгохгүй (src/app/lib/dispatch.ts-тэй ижил)
    .filter((x: { id: string; d: number }) => {
      const r = VEHICLE_REACH[vehicleOf.get(x.id) ?? ""];
      return !r || ((!tripKm || tripKm <= r.tripKm) && x.d <= r.pickupKm);
    })
    .sort((a: { d: number }, b: { d: number }) => a.d - b.d)
    .slice(0, OFFER_BATCH)
    .map((x: { id: string }) => x.id);
}

async function sendToAll(subs: Sub[], payloadStr: string) {
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr,
        );
      } catch (err) {
        // 404/410 = subscription устсан/хугацаа дууссан → DB-ээс цэвэрлэнэ
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;
  const oldRecord = payload.old_record;
  if (!record) return new Response("no record", { status: 200 });

  const route = `${record.from_address} → ${record.to_address}`;

  // ── Шинэ захиалга ирэхэд бүх идэвхтэй operator-т мэдэгдэнэ ──────────
  if (payload.type === "INSERT") {
    const { data: opSubs } = await supabase.from("push_subscriptions").select("*").eq("role", "operator");
    if (opSubs?.length) {
      await sendToAll(opSubs, JSON.stringify({ title: "Шинэ захиалга ирлээ", body: route, orderId: record.id, url: "/" }));
    }
    return new Response("insert handled", { status: 200 });
  }

  if (payload.type !== "UPDATE") return new Response("ignored event", { status: 200 });

  // ── Төлбөр орж хүргэгч хайж эхлэхэд хамгийн ойр 4 хүргэгчид санал ──
  if (record.status === "жолооч хайж байна" && oldRecord?.status !== "жолооч хайж байна" && !record.courier_id) {
    const targets = await nearestCourierIds(record);
    if (targets.length) {
      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("role", "courier").in("user_id", targets);
      if (subs?.length) {
        const earn = Math.round((record.price ?? 0) * 0.8);
        await sendToAll(
          subs,
          JSON.stringify({
            title: record.urgent ? `⚡ Яаралтай санал · ₮${earn.toLocaleString()}` : `Шинэ санал · ₮${earn.toLocaleString()}`,
            body: `${route} — эхэлж "Авах" дарсан нь авна`,
            orderId: record.id,
            url: "/",
            urgent: true,
          }),
        );
      }
    }
  }

  // ── Хүргэгч шинээр томилогдоход тухайн хүргэгчид мэдэгдэнэ ──────────
  if (record.courier_id && record.courier_id !== oldRecord?.courier_id) {
    const { data: crSubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("role", "courier")
      .eq("user_id", record.courier_id);
    if (crSubs?.length) {
      await sendToAll(
        crSubs,
        JSON.stringify({
          title: record.urgent ? "⚡ ЯАРАЛТАЙ ачаа томилогдлоо" : "Танд шинэ ачаа томилогдлоо",
          body: route,
          orderId: record.id,
          url: "/",
          urgent: true, // sw.js дээр чичиргээ + requireInteraction
        }),
      );
    }
  }

  // ── Захиалагчид статусын шинэчлэлт ──────────────────────────────────
  if (record.status !== oldRecord?.status) {
    const msg = STATUS_MESSAGES[record.status];
    if (msg) {
      const { data: cuSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("role", "customer")
        .eq("user_id", record.customer_id);
      if (cuSubs?.length) {
        await sendToAll(cuSubs, JSON.stringify({ ...msg, orderId: record.id, url: "/" }));
      }
    }
  }

  return new Response("update handled", { status: 200 });
});
