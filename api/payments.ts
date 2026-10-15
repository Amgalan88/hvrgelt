// hvrgelt — Онлайн төлбөр (Byl: QPay + карт; эсвэл QPay шууд)
//
// Vercel Function — push хийхэд автоматаар deploy болно. Нууц түлхүүрүүд
// Vercel → Settings → Environment Variables-д (VITE_ угтваргүй) хадгалагдана,
// хөтөч рүү ХЭЗЭЭ Ч очихгүй.
//
//   BYL_API_TOKEN, BYL_PROJECT_ID, BYL_WEBHOOK_SECRET   — Byl
//   QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE      — эсвэл QPay шууд
//   SUPABASE_SERVICE_ROLE_KEY                             — захиалгыг төлөгдсөн болгоход
//
// Хүсэлтүүд (нэг функц — Vercel-ийн зөвлөмжийн дагуу):
//   POST /api/payments?action=create   { orderId }    → нэхэмжлэх (url эсвэл QR)
//   POST /api/payments?action=check    { paymentId }  → провайдероос лавлаж баталгаажуулна
//   POST /api/payments?action=webhook  (Byl)          → Byl-Signature шалгаж баталгаажуулна
//
// Аюулгүй байдал: дүнг апп-аас биш DB-ээс уншина; гарын үсэггүй хүсэлтэд
// итгэхгүй — сервер өөрөө Byl/QPay-ээс асууж, үнэхээр төлөгдсөн бол л
// захиалгыг урагшлуулна.

import { createClient } from "@supabase/supabase-js";

const env = (k: string) => process.env[k]?.trim() || "";


type Provider = "byl" | "qpay" | null;
function provider(): Provider {
  if (env("BYL_API_TOKEN") && env("BYL_PROJECT_ID")) return "byl";
  if (env("QPAY_USERNAME") && env("QPAY_PASSWORD") && env("QPAY_INVOICE_CODE")) return "qpay";
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function db() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY тохируулаагүй байна");
  return createClient(url, key, { auth: { persistSession: false } });
}

function hhmm() {
  const d = new Date(Date.now() + 8 * 3600_000); // Монголын цаг (UTC+8)
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// ── Byl ────────────────────────────────────────────────────────────────
// https://byl.mn/docs/en/api/invoices.html , https://byl.mn/docs/en/webhook.html

const BYL = "https://byl.mn/api/v1";

async function bylCreate(orderId: string, amount: number) {
  const res = await fetch(`${BYL}/projects/${encodeURIComponent(env("BYL_PROJECT_ID"))}/invoices`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("BYL_API_TOKEN")}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description: `Дархан хүргэлт — захиалга #${orderId}`.slice(0, 255) }),
  });
  if (!res.ok) throw new Error(`Byl нэхэмжлэх үүсгэж чадсангүй: ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  return { invoiceId: String(data.id), checkoutUrl: data.url as string, qrText: undefined as string | undefined, qrImage: undefined as string | undefined, raw: data };
}

async function bylPaid(invoiceId: string, minAmount: number): Promise<boolean> {
  const res = await fetch(`${BYL}/projects/${encodeURIComponent(env("BYL_PROJECT_ID"))}/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${env("BYL_API_TOKEN")}`, Accept: "application/json" },
  });
  if (!res.ok) return false;
  const { data } = await res.json();
  return data?.status === "paid" && Number(data.amount) >= minAmount;
}

/** HMAC-SHA256(raw body, signing secret), hex — тогтмол хугацаат харьцуулалт */
async function bylSignatureValid(raw: string, signature: string): Promise<boolean> {
  const secret = env("BYL_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ── QPay (шууд merchant гэрээтэй бол) ───────────────────────────────────

async function qpayToken(): Promise<string> {
  const res = await fetch("https://merchant.qpay.mn/v2/auth/token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${env("QPAY_USERNAME")}:${env("QPAY_PASSWORD")}`) },
  });
  if (!res.ok) throw new Error(`QPay нэвтрэлт амжилтгүй: ${res.status}`);
  return (await res.json()).access_token as string;
}

async function qpayCreate(orderId: string, amount: number, paymentId: string) {
  const res = await fetch("https://merchant.qpay.mn/v2/invoice", {
    method: "POST",
    headers: { Authorization: `Bearer ${await qpayToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_code: env("QPAY_INVOICE_CODE"),
      sender_invoice_no: paymentId,
      invoice_receiver_code: "terminal",
      invoice_description: `Дархан хүргэлт — захиалга #${orderId}`,
      amount,
    }),
  });
  if (!res.ok) throw new Error(`QPay нэхэмжлэх амжилтгүй: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { invoiceId: data.invoice_id as string, checkoutUrl: undefined as string | undefined, qrText: data.qr_text as string, qrImage: data.qr_image as string, raw: data };
}

async function qpayPaid(invoiceId: string): Promise<boolean> {
  const res = await fetch("https://merchant.qpay.mn/v2/payment/check", {
    method: "POST",
    headers: { Authorization: `Bearer ${await qpayToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return (data.count ?? 0) > 0 && (data.paid_amount ?? 0) > 0;
}

// ── Үйлдлүүд ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markPaid(supabase: any, payment: any) {
  if (payment.status === "paid") return;
  await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payment.id);
  await supabase
    .from("orders")
    .update({ status: "жолооч хайж байна", payment_status: "төлөгдсөн", payment_method: payment.provider, paid_at: hhmm() })
    .eq("id", payment.order_id)
    .eq("status", "төлбөр хүлээж байна");
}

async function create(body: { orderId?: string }) {
  const prov = provider();
  if (!prov) return json({ error: "Онлайн төлбөр тохируулаагүй" }, 501);
  if (!body.orderId) return json({ error: "orderId шаардлагатай" }, 400);
  const supabase = db();

  // Дүнг DB-ээс уншина — апп-аас ирсэн дүнд итгэхгүй
  const { data: order } = await supabase.from("orders").select("id, price, status").eq("id", body.orderId).single();
  if (!order) return json({ error: "Захиалга олдсонгүй" }, 404);
  if (order.status !== "төлбөр хүлээж байна") return json({ error: "Захиалга төлбөрийн шатанд байхгүй" }, 409);
  if (!(order.price > 0)) return json({ error: "Үнэ тогтоогдоогүй" }, 400);

  // Апп-ыг нээх бүрт шинэ нэхэмжлэх үүсгэхгүй
  const since = new Date(Date.now() - 23 * 3600_000).toISOString();
  const { data: existing } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .eq("provider", prov)
    .eq("status", "pending")
    .eq("amount", order.price)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  const ex = existing?.[0];
  if (ex && (ex.checkout_url || ex.qr_image)) {
    return json({ paymentId: ex.id, provider: prov, checkoutUrl: ex.checkout_url ?? undefined, qrText: ex.qr_text ?? undefined, qrImage: ex.qr_image ?? undefined, banks: ex.raw?.urls ?? [] });
  }

  const paymentId = `pay-${order.id}-${Date.now()}`;
  const inv = prov === "byl" ? await bylCreate(order.id, order.price) : await qpayCreate(order.id, order.price, paymentId);
  await supabase.from("payments").insert({
    id: paymentId,
    order_id: order.id,
    provider: prov,
    invoice_id: inv.invoiceId,
    amount: order.price,
    status: "pending",
    qr_text: inv.qrText ?? null,
    qr_image: inv.qrImage ?? null,
    checkout_url: inv.checkoutUrl ?? null,
    raw: inv.raw,
    created_at: new Date().toISOString(),
  });
  return json({ paymentId, provider: prov, checkoutUrl: inv.checkoutUrl, qrText: inv.qrText, qrImage: inv.qrImage, banks: inv.raw?.urls ?? [] });
}

async function check(body: { paymentId?: string }) {
  if (!body.paymentId) return json({ error: "paymentId шаардлагатай" }, 400);
  const supabase = db();
  const { data: rows } = await supabase.from("payments").select("*").eq("id", body.paymentId).limit(1);
  const payment = rows?.[0];
  if (!payment) return json({ paid: false, error: "Төлбөр олдсонгүй" }, 404);
  if (payment.status === "paid") return json({ paid: true });

  let paid = false;
  if (payment.provider === "byl" && payment.invoice_id) paid = await bylPaid(payment.invoice_id, Number(payment.amount));
  else if (payment.provider === "qpay" && payment.invoice_id) paid = await qpayPaid(payment.invoice_id);
  if (paid) await markPaid(supabase, payment);
  return json({ paid });
}

async function bylWebhook(raw: string, signature: string) {
  if (!(await bylSignatureValid(raw, signature))) return json({ error: "invalid signature" }, 401);
  const event = JSON.parse(raw);
  if (event.type !== "invoice.paid") return json({ ok: true, ignored: event.type });
  const inv = event.data?.object;
  const supabase = db();
  const { data: rows } = await supabase.from("payments").select("*").eq("provider", "byl").eq("invoice_id", String(inv?.id)).limit(1);
  const payment = rows?.[0];
  // 200 буцаана — Byl дахин дахин илгээхгүй
  if (!payment) return json({ ok: true, note: "payment not found" });
  if (Number(inv?.amount) < Number(payment.amount)) return json({ ok: true, note: "amount mismatch" });
  await markPaid(supabase, payment);
  return json({ ok: true });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "POST шаардлагатай" }, 405);
    const action = new URL(request.url).searchParams.get("action");
    try {
      const raw = await request.text();
      if (action === "webhook") return await bylWebhook(raw, request.headers.get("byl-signature") ?? "");
      const body = raw ? JSON.parse(raw) : {};
      if (action === "create") return await create(body);
      if (action === "check") return await check(body);
      return json({ error: "unknown action" }, 404);
    } catch (err) {
      console.error("payments", action, err);
      return json({ error: err instanceof Error ? err.message : "Алдаа гарлаа" }, 500);
    }
  },
};
