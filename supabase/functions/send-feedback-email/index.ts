// hvrgelt — Санал хүсэлтийг и-мэйлээр дамжуулах
//
// Хүргэгдсэний дараах дэлгэцээс ирсэн саналыг тогтоосон и-мэйл рүү
// илгээнэ. Санал өөрөө `feedback` хүснэгтэд аль хэдийн хадгалагдсан
// байдаг тул энэ функц ажиллахгүй байсан ч мэдээлэл алдагдахгүй.
//
// Deploy:
//   supabase functions deploy send-feedback-email --no-verify-jwt
//   supabase secrets set FEEDBACK_EMAIL_TO=<таны gmail хаяг> \
//     RESEND_API_KEY=... FEEDBACK_EMAIL_FROM="hvrgelt.mn <no-reply@<таны домэйн>>"
//
// Тайлбар: Gmail руу шууд SMTP-ээр илгээх боломжгүй тул Resend
// (resend.com) шиг и-мэйл үйлчилгээ ашиглана. RESEND_API_KEY
// тохируулаагүй бол функц зөвхөн лог бичээд өнгөрнө.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TO = Deno.env.get("FEEDBACK_EMAIL_TO");
const FROM = Deno.env.get("FEEDBACK_EMAIL_FROM") ?? "hvrgelt.mn <onboarding@resend.dev>";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { id, phone, message, orderId } = await req.json();

    if (!RESEND_KEY || !TO) {
      console.log("feedback (и-мэйл тохируулаагүй):", { id, phone, orderId, message });
      return new Response(JSON.stringify({ ok: true, emailed: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: undefined,
        subject: `hvrgelt.mn — шинэ санал хүсэлт${orderId ? ` (#${orderId})` : ""}`,
        text: [
          `Утас: ${phone}`,
          orderId ? `Захиалга: #${orderId}` : "",
          "",
          message,
          "",
          `— hvrgelt.mn, ${new Date().toLocaleString("mn-MN")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });

    const emailed = res.ok;
    if (!emailed) console.error("resend", res.status, await res.text());
    if (id) await supabase.from("feedback").update({ emailed }).eq("id", id);

    return new Response(JSON.stringify({ ok: true, emailed }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-feedback-email", err);
    return new Response(JSON.stringify({ error: "failed" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
