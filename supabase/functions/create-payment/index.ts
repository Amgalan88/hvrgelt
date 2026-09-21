// hvrgelt — Төлбөрийн нэхэмжлэх үүсгэх (QPay / Bonum)
//
// Апп энэ функцийг дуудаж QR-аа авна. Төлбөрийн API түлхүүр зөвхөн
// энд байна — client талд хэзээ ч гарахгүй.
//
// Deploy:
//   supabase functions deploy create-payment --no-verify-jwt
//
// QPay:
//   supabase secrets set PAYMENT_PROVIDER=qpay \
//     QPAY_USERNAME=... QPAY_PASSWORD=... QPAY_INVOICE_CODE=... \
//     PUBLIC_CALLBACK_URL=https://<project>.functions.supabase.co/payment-webhook
//
// Bonum (merchant эрх авсны дараа):
//   supabase secrets set PAYMENT_PROVIDER=bonum \
//     BONUM_API_BASE=... BONUM_API_KEY=... BONUM_MERCHANT_ID=...
//
// ⚠️ Bonum-ийн эндпойнт/талбарын нэрийг merchant докоороо тулгаж
//    доорх createBonumInvoice() дотор тааруулна уу.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROVIDER = (Deno.env.get("PAYMENT_PROVIDER") ?? "qpay").toLowerCase();
const CALLBACK_URL = Deno.env.get("PUBLIC_CALLBACK_URL") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── QPay v2 ───────────────────────────────────────────────────────────
async function qpayToken(): Promise<string> {
  const user = Deno.env.get("QPAY_USERNAME")!;
  const pass = Deno.env.get("QPAY_PASSWORD")!;
  const res = await fetch("https://merchant.qpay.mn/v2/auth/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${user}:${pass}`),
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

async function createQpayInvoice(orderId: string, amount: number, paymentId: string) {
  const token = await qpayToken();
  const res = await fetch("https://merchant.qpay.mn/v2/invoice", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_code: Deno.env.get("QPAY_INVOICE_CODE"),
      sender_invoice_no: paymentId,
      invoice_receiver_code: "terminal",
      invoice_description: `hvrgelt.mn захиалга #${orderId}`,
      amount,
      callback_url: CALLBACK_URL ? `${CALLBACK_URL}?payment_id=${paymentId}` : undefined,
    }),
  });
  if (!res.ok) throw new Error(`QPay invoice failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    invoiceId: data.invoice_id as string,
    qrText: data.qr_text as string | undefined,
    qrImage: data.qr_image as string | undefined,
    checkoutUrl: (data.urls?.[0]?.link as string | undefined) ?? undefined,
    raw: data,
  };
}

// ── Bonum ─────────────────────────────────────────────────────────────
// Merchant портал: https://merchant.bonum.mn/ — эндпойнт/талбарын нэрийг
// өөрсдийн доктой тулгаж энэ функцийг тааруулна.
async function createBonumInvoice(orderId: string, amount: number, paymentId: string) {
  const base = Deno.env.get("BONUM_API_BASE");
  const key = Deno.env.get("BONUM_API_KEY");
  if (!base || !key) throw new Error("BONUM_API_BASE / BONUM_API_KEY тохируулаагүй байна");

  const res = await fetch(`${base.replace(/\/$/, "")}/payment/qr`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantId: Deno.env.get("BONUM_MERCHANT_ID"),
      orderId: paymentId,
      amount,
      description: `hvrgelt.mn захиалга #${orderId}`,
      callbackUrl: CALLBACK_URL ? `${CALLBACK_URL}?payment_id=${paymentId}` : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Bonum invoice failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    invoiceId: (data.invoiceId ?? data.id) as string,
    qrText: data.qrText as string | undefined,
    qrImage: data.qrImage as string | undefined,
    checkoutUrl: (data.checkoutUrl ?? data.url) as string | undefined,
    raw: data,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { orderId, amount } = await req.json();
    if (!orderId) return json({ error: "orderId шаардлагатай" }, 400);

    // Дүнг client-ээс биш, DB-ээс уншина
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, price, status")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) return json({ error: "Захиалга олдсонгүй" }, 404);

    const finalAmount = order.price > 0 ? order.price : Math.max(0, Number(amount) || 0);
    if (finalAmount <= 0) return json({ error: "Үнэ тогтоогдоогүй байна" }, 400);

    const paymentId = `pay-${orderId}-${Date.now()}`;
    const invoice =
      PROVIDER === "bonum"
        ? await createBonumInvoice(orderId, finalAmount, paymentId)
        : await createQpayInvoice(orderId, finalAmount, paymentId);

    await supabase.from("payments").insert({
      id: paymentId,
      order_id: orderId,
      provider: PROVIDER,
      invoice_id: invoice.invoiceId,
      amount: finalAmount,
      status: "pending",
      qr_text: invoice.qrText ?? null,
      qr_image: invoice.qrImage ?? null,
      checkout_url: invoice.checkoutUrl ?? null,
      raw: invoice.raw,
      created_at: new Date().toISOString(),
    });

    return json({
      paymentId,
      provider: PROVIDER,
      qrText: invoice.qrText,
      qrImage: invoice.qrImage,
      checkoutUrl: invoice.checkoutUrl,
    });
  } catch (err) {
    console.error("create-payment", err);
    return json({ error: err instanceof Error ? err.message : "Тодорхойгүй алдаа" }, 500);
  }
});
