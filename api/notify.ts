// hvrgelt — Админд push мэдэгдэл (Vercel Function)
//
//   POST /api/notify   { event: "courier-docs", courierId }
//     Хүргэгч баримтаа бүрэн оруулмагц апп дуудна. Сервер DB-ээс өөрөө
//     шалгаад (баталгаажаагүй, хэрэгслийн шаардлага бүрэн) push-ээ
//     идэвхжүүлсэн супер админуудад "Шинэ хүргэгч шалгалт хүлээж байна"
//     илгээнэ. Апп-аас ирсэн өгөгдөлд итгэхгүй.
//
// Vercel → Environment Variables (VITE_ угтваргүй, нууц):
//   VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY
//   (нээлттэй түлхүүрийг VITE_VAPID_PUBLIC_KEY-ээс уншина; VAPID_SUBJECT заавал биш)
// Тохируулаагүй бол 501 — апп ердийнхөөрөө ажиллана.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const env = (k: string) => process.env[k]?.trim() || "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function db() {
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

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendToRole(supabase: any, role: string, payload: object): Promise<number> {
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("role", role);
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

async function courierDocs(body: { courierId?: string }) {
  if (!body.courierId) return json({ error: "courierId шаардлагатай" }, 400);
  const supabase = db();
  if (!supabase || !vapidReady()) return json({ error: "Push тохируулаагүй" }, 501);

  const { data: c } = await supabase.from("couriers").select("*").eq("id", body.courierId).single();
  if (!c) return json({ error: "Хүргэгч олдсонгүй" }, 404);
  if (c.verified || !docsComplete(c)) return json({ ok: true, sent: 0, note: "шалгах шаардлагагүй" });

  const sent = await sendToRole(supabase, "superadmin", {
    title: "Шинэ хүргэгч шалгалт хүлээж байна",
    body: `${c.name} (${c.vehicle}) баримтаа бүрэн оруулсан. Шалгаад баталгаажуулна уу.`,
    url: "/",
  });
  return json({ ok: true, sent });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "POST шаардлагатай" }, 405);
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.event === "courier-docs") return await courierDocs(body);
      return json({ error: "unknown event" }, 404);
    } catch (err) {
      console.error("notify", err);
      return json({ error: err instanceof Error ? err.message : "Алдаа гарлаа" }, 500);
    }
  },
};
