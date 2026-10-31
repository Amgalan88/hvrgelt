// Verify.MN: хэрэглэгч өөрийн утаснаасаа 144773 руу кодоо SMS-ээр илгээнэ.
// Callback бол зөвхөн дохио — үр дүнг үргэлж GET /sessions/:id-ээр шалгана.
// aicargo lib/verify-mn.ts-тэй ижил протокол.
import crypto from "node:crypto";

const BASE = "https://api.verify.mn";
const MOCK_VERIFY_AFTER_MS = 4000;
const apiKey = () => process.env.VERIFY_MN_API_KEY?.trim() ?? "";

export type VerifySession = { sessionId: string; shortcode: string; text: string; expiresAt: Date; smsUri: string };
export type VerifyStatus = "PENDING" | "VERIFIED" | "EXPIRED";

// Түлхүүр байвал үргэлж жинхэнэ горим. Туршилтын горим production-д хэзээ ч асахгүй.
export function verifyMode(): "live" | "mock" | "off" {
  if (apiKey()) return "live";
  if (process.env.VERIFY_MN_MOCK === "1" && process.env.VERCEL_ENV !== "production") return "mock";
  return "off";
}

export function newCode() {
  return String(crypto.randomInt(100000, 1000000));
}

// Хариу SMS: зөвхөн латин үсэг/тоо, 160 тэмдэгт хүртэл (Unitel өөрийн текстийг, Lime юу ч илгээдэггүй)
const RESPONSE_SMS = "Hvrgelt: utasny dugaar batalgaajlaa. Bayarlalaa!";

export async function createSession(phone: string, text: string, callback?: string): Promise<VerifySession> {
  if (verifyMode() === "mock") {
    return {
      sessionId: `mock_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`,
      shortcode: "144773",
      text,
      smsUri: `sms:144773?body=${encodeURIComponent(text)}`,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    };
  }
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({ phone, text, ...(callback ? { callback } : {}), responseSms: RESPONSE_SMS }),
  });
  if (!res.ok) throw new Error(`verify.mn ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const code = String(data.text ?? text);
  return {
    sessionId: String(data.sessionId),
    shortcode: String(data.shortcode ?? "144773"),
    text: code,
    smsUri: String(data.smsUri ?? `sms:${data.shortcode ?? "144773"}?body=${encodeURIComponent(code)}`),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 5 * 60_000),
  };
}

// GET /sessions/:id нэвтрэлт шаарддаггүй — sessionId өөрөө нууц тул зөвхөн серверт хадгална
export async function getStatus(sessionId: string, createdAt: Date): Promise<VerifyStatus> {
  if (sessionId.startsWith("mock_")) {
    if (verifyMode() !== "mock") return "EXPIRED";
    return Date.now() - createdAt.getTime() > MOCK_VERIFY_AFTER_MS ? "VERIFIED" : "PENDING";
  }
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`verify.mn ${res.status}`);
  const data = await res.json();
  const s = String(data.sessionStatus);
  return s === "VERIFIED" || s === "EXPIRED" ? s : "PENDING";
}
