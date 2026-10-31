// hvrgelt — Утас баталгаажуулалт (Verify.MN)
//
//   POST /api/phone-verify  { phone, purpose, role? }
//   GET  /api/phone-verify?id=        төлөв PENDING | VERIFIED | EXPIRED
//   GET  /api/phone-verify?ready=1    25.sql ажилласан эсэх, горим
//
// sessionId хөтөч рүү хэзээ ч явахгүй. purpose=phone үед Authorization: Bearer.

import { phoneVerifyReady, supabasePhoneDb } from "../server/phone-db.js";
import { refreshVerification, startVerification, type Purpose, type StartError, type VerifyRole } from "../server/phone-verification.js";
import { verifyMode } from "../server/verify-mn.js";
import { adminClient } from "../server/supabase-admin.js";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const MESSAGES: Record<StartError, string> = {
  badPhone: "Утасны дугаар 8 оронтой байна",
  phoneTaken: "Энэ утасны дугаар бүртгэлтэй байна. Нэвтэрнэ үү",
  noAccount: "Энэ дугаараар бүртгэл олдсонгүй",
  cantReset: "Энэ бүртгэлд утсаар сэргээх боломжгүй",
  unavailable: "SMS баталгаажуулалт түр ажиллахгүй байна. Дараа дахин оролдоно уу",
  tooMany: "Хэт олон оролдлого хийлээ. 10 минутын дараа дахин оролдоно уу",
};

const PURPOSES: Purpose[] = ["signup", "reset", "phone"];

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

async function selfId(request: Request): Promise<{ role: string; id: string } | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await db.auth.getUser(token);
  const meta = data.user?.app_metadata ?? {};
  return meta.app_role ? { role: String(meta.app_role), id: String(meta.account_id) } : null;
}

export default {
  async fetch(request: Request) {
    try {
      const db = adminClient();
      const url = new URL(request.url);

      if (request.method === "GET" && url.searchParams.get("ready") === "1") {
        const ready = await phoneVerifyReady(db);
        return json({ ready, mode: verifyMode() });
      }

      if (request.method === "GET") {
        const id = url.searchParams.get("id") ?? "";
        if (!id || id.length > 64) return json({ status: "EXPIRED" });
        return json({ status: await refreshVerification(supabasePhoneDb(db), id) });
      }

      if (request.method !== "POST") return json({ error: "POST шаардлагатай" }, 405);

      if (!(await phoneVerifyReady(db))) {
        return json({ ok: false, code: "NOT_READY", error: MESSAGES.unavailable }, 503);
      }

      const body = await request.json().catch(() => ({}));
      const purpose: Purpose = PURPOSES.includes(body.purpose) ? body.purpose : "signup";
      const self = purpose === "phone" ? await selfId(request) : null;
      if (purpose === "phone" && !self) return json({ error: "Дахин нэвтэрнэ үү" }, 401);
      if (purpose === "phone" && self && self.role !== "customer" && self.role !== "courier") {
        return json({ error: "Энэ бүртгэлд утсаар баталгаажуулах боломжгүй" }, 403);
      }
      const role: VerifyRole | undefined = body.role === "courier" ? "courier" : body.role === "customer" ? "customer" : undefined;
      if (purpose === "signup" && !role) return json({ error: "Бүртгэлийн төрлөө сонгоно уу" }, 400);

      const res = await startVerification(supabasePhoneDb(db), String(body.phone ?? ""), purpose, {
        role,
        selfUserId: self?.id,
        ip: clientIp(request),
      });
      if (res.ok) return json(res);
      const error =
        res.error === "phoneTaken" && purpose === "phone"
          ? "Энэ дугаар өөр бүртгэлд байна"
          : MESSAGES[res.error];
      return json({ ok: false, error }, res.error === "tooMany" ? 429 : 400);
    } catch (err) {
      console.error("phone-verify", err);
      return json({ error: "Серверийн алдаа. Дахин оролдоно уу." }, 500);
    }
  },
};
