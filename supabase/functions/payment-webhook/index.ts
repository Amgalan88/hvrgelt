// hvrgelt — Төлбөрийн callback (QPay / Bonum)
//
// Төлбөр орсныг банк/PSP энэ хаяг руу мэдэгдэнэ. Бид QPay-ийн хувьд
// дүнг дахин шалгаад (check API) баталгаажуулж, захиалгыг
// "жолооч хайж байна" төлөвт шилжүүлнэ.
//
// Deploy:
//   supabase functions deploy payment-webhook --no-verify-jwt
//   supabase secrets set PAYMENT_PROVIDER=qpay QPAY_USERNAME=... QPAY_PASSWORD=...
//
// Callback URL:
//   https://<project>.functions.supabase.co/payment-webhook?payment_id=<paymentId>

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROVIDER = (Deno.env.get("PAYMENT_PROVIDER") ?? "qpay").toLowerCase();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function hhmm() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** QPay дээр нэхэмжлэх үнэхээр төлөгдсөн эсэхийг шалгана */
async function qpayVerify(invoiceId: string): Promise<boolean> {
  const user = Deno.env.get("QPAY_USERNAME");
  const pass = Deno.env.get("QPAY_PASSWORD");
  if (!user || !pass) return true; // шалгах боломжгүй — callback-д итгэнэ

  const auth = await fetch("https://merchant.qpay.mn/v2/auth/token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${user}:${pass}`), "Content-Type": "application/json" },
  });
  if (!auth.ok) return false;
  const { access_token } = await auth.json();

  const res = await fetch("https://merchant.qpay.mn/v2/payment/check", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return (data.count ?? 0) > 0 && (data.paid_amount ?? 0) > 0;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let paymentId = url.searchParams.get("payment_id") ?? undefined;
    let invoiceId = url.searchParams.get("invoice_id") ?? undefined;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        paymentId = paymentId ?? body.payment_id ?? body.sender_invoice_no ?? body.orderId;
        invoiceId = invoiceId ?? body.object_id ?? body.invoice_id ?? body.invoiceId;
      } catch {
        /* хоосон body */
      }
    }

    if (!paymentId && !invoiceId) return new Response("payment_id шаардлагатай", { status: 400 });

    const q = supabase.from("payments").select("*").limit(1);
    const { data: rows } = paymentId ? await q.eq("id", paymentId) : await q.eq("invoice_id", invoiceId!);
    const payment = rows?.[0];
    if (!payment) return new Response("payment олдсонгүй", { status: 404 });

    // Давхар callback — аль хэдийн төлөгдсөн бол дахин бичихгүй
    if (payment.status === "paid") return new Response("ok (already paid)");

    if (PROVIDER === "qpay" && payment.invoice_id) {
      const ok = await qpayVerify(payment.invoice_id);
      if (!ok) {
        await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
        return new Response("not paid", { status: 402 });
      }
    }

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
      .eq("id", payment.order_id);

    return new Response("ok");
  } catch (err) {
    console.error("payment-webhook", err);
    return new Response("error", { status: 500 });
  }
});
