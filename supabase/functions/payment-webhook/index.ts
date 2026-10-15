// hvrgelt — Төлбөр баталгаажуулах (Byl / QPay)
//
// Хоёр замаар дуудагдана:
//   1. Byl-ийн webhook — `Byl-Signature` header-тэй (HMAC-SHA256, raw body).
//      Гарын үсэг таарвал `invoice.paid` үйл явдлаар төлбөрийг баталгаажуулна.
//   2. Гарын үсэггүй дуудлага — QPay callback эсвэл апп-ын "Төлбөрөө шалгах".
//      Энэ үед хүсэлтэд ИТГЭХГҮЙ: сервер өөрөө Byl/QPay-ээс лавлаж, үнэхээр
//      төлөгдсөн бол л баталгаажуулна.
//
// Өмнө нь гарын үсэггүй хүсэлтээр (Bonum горимд, эсвэл QPay түлхүүргүй үед)
// шалгалгүйгээр "төлөгдсөн" болгодог байсан — хэн ч payment_id илгээгээд
// төлбөргүйгээр хүргэгч дуудаж чадахаар байв.
//
// Deploy:
//   supabase functions deploy payment-webhook --no-verify-jwt
//
// Secrets:
//   Byl:  PAYMENT_PROVIDER=byl BYL_API_TOKEN=... BYL_PROJECT_ID=... BYL_WEBHOOK_SECRET=...
//   QPay: PAYMENT_PROVIDER=qpay QPAY_USERNAME=... QPAY_PASSWORD=...

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (text: string, status = 200) => new Response(text, { status, headers: CORS });

function hhmm() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Byl ───────────────────────────────────────────────────────────────

/** https://byl.mn/docs/en/webhook.html — HMAC-SHA256(raw body, signing secret), hex */
async function bylSignatureValid(rawBody: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("BYL_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = signature.trim().toLowerCase();
  // Тогтмол хугацаат харьцуулалт
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** Byl-ээс нэхэмжлэхийн бодит төлөвийг асууна */
async function bylInvoicePaid(invoiceId: string, minAmount: number): Promise<boolean> {
  const token = Deno.env.get("BYL_API_TOKEN");
  const project = Deno.env.get("BYL_PROJECT_ID");
  if (!token || !project) return false;
  const res = await fetch(
    `https://byl.mn/api/v1/projects/${encodeURIComponent(project)}/invoices/${encodeURIComponent(invoiceId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!res.ok) return false;
  const { data } = await res.json();
  return data?.status === "paid" && Number(data.amount) >= minAmount;
}

// ── QPay ──────────────────────────────────────────────────────────────

/** QPay дээр нэхэмжлэх үнэхээр төлөгдсөн эсэхийг шалгана */
async function qpayInvoicePaid(invoiceId: string): Promise<boolean> {
  const user = Deno.env.get("QPAY_USERNAME");
  const pass = Deno.env.get("QPAY_PASSWORD");
  // Түлхүүргүй бол шалгах боломжгүй — итгэхгүй
  if (!user || !pass) return false;

  const auth = await fetch("https://merchant.qpay.mn/v2/auth/token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${user}:${pass}`), "Content-Type": "application/json" },
  });
  if (!auth.ok) return false;
  const { access_token } = await auth.json();

  const res = await fetch("https://merchant.qpay.mn/v2/payment/check", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return (data.count ?? 0) > 0 && (data.paid_amount ?? 0) > 0;
}

// ── Баталгаажуулах ────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function markPaid(payment: any) {
  if (payment.status === "paid") return; // давхар ирсэн — дахин бичихгүй
  const now = new Date().toISOString();
  await supabase.from("payments").update({ status: "paid", paid_at: now }).eq("id", payment.id);
  await supabase
    .from("orders")
    .update({
      status: "жолооч хайж байна",
      payment_status: "төлөгдсөн",
      payment_method: payment.provider,
      paid_at: hhmm(),
    })
    .eq("id", payment.order_id)
    .eq("status", "төлбөр хүлээж байна");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return reply("ok");
  try {
    const raw = req.method === "POST" ? await req.text() : "";
    const signature = req.headers.get("Byl-Signature") ?? req.headers.get("byl-signature");

    // 1. Byl webhook
    if (signature) {
      if (!(await bylSignatureValid(raw, signature))) return reply("invalid signature", 401);
      const event = JSON.parse(raw);
      if (event.type !== "invoice.paid") return reply("ignored");
      const inv = event.data?.object;
      const { data: rows } = await supabase
        .from("payments")
        .select("*")
        .eq("provider", "byl")
        .eq("invoice_id", String(inv?.id))
        .limit(1);
      const payment = rows?.[0];
      if (!payment) return reply("payment олдсонгүй"); // 200 — Byl дахин дахин илгээхгүй
      if (Number(inv?.amount) < Number(payment.amount)) return reply("amount mismatch", 200);
      await markPaid(payment);
      return reply("ok");
    }

    // 2. Гарын үсэггүй — QPay callback эсвэл апп-ын шалгалт
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("payment_id") ?? undefined;
    let invoiceId = url.searchParams.get("invoice_id") ?? undefined;
    if (raw) {
      try {
        const body = JSON.parse(raw);
        paymentId = paymentId ?? body.payment_id ?? body.sender_invoice_no;
        invoiceId = invoiceId ?? body.object_id ?? body.invoice_id;
      } catch {
        /* хоосон эсвэл JSON биш body */
      }
    }
    if (!paymentId && !invoiceId) return reply("payment_id шаардлагатай", 400);

    const q = supabase.from("payments").select("*").limit(1);
    const { data: rows } = paymentId ? await q.eq("id", paymentId) : await q.eq("invoice_id", invoiceId!);
    const payment = rows?.[0];
    if (!payment) return reply("payment олдсонгүй", 404);
    if (payment.status === "paid") return reply("ok (already paid)");

    let paid = false;
    if (payment.provider === "byl" && payment.invoice_id) paid = await bylInvoicePaid(payment.invoice_id, Number(payment.amount));
    else if (payment.provider === "qpay" && payment.invoice_id) paid = await qpayInvoicePaid(payment.invoice_id);
    // Бусад provider (Bonum г.м.) — шалгах API холбогдоогүй тул баталгаажуулахгүй

    if (!paid) return reply("not paid", 402);
    await markPaid(payment);
    return reply("ok");
  } catch (err) {
    console.error("payment-webhook", err);
    return reply("error", 500);
  }
});
