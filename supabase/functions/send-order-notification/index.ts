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
  "томилогдсон": { title: "Хүргэгч томилогдлоо", body: "Таны захиалгыг хүргэгч удахгүй авах болно." },
  "авсан": { title: "Ачаа авлаа", body: "Хүргэгч ачааг авлаа. Удахгүй хүргэнэ." },
  "хүргэгдсэн": { title: "Хүргэгдлээ ✅", body: "Таны захиалга амжилттай хүргэгдлээ. Баярлалаа!" },
  "цуцлагдсан": { title: "Захиалга цуцлагдлаа", body: "Таны захиалга цуцлагдсан байна." },
};

interface Sub { endpoint: string; p256dh: string; auth: string }

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

  // ── Хүргэгч шинээр томилогдоход тухайн хүргэгчид мэдэгдэнэ ──────────
  if (record.courier_id && record.courier_id !== oldRecord?.courier_id) {
    const { data: crSubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("role", "courier")
      .eq("user_id", record.courier_id);
    if (crSubs?.length) {
      await sendToAll(crSubs, JSON.stringify({ title: "Танд шинэ ачаа томилогдлоо", body: route, orderId: record.id, url: "/" }));
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
