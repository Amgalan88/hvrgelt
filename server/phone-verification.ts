// Утас баталгаажуулалтын логик (Verify.MN). UI текстгүй — алдааны кодыг буцаана.
// aicargo lib/phone-verification.ts-тэй ижил дүрэм, hvrgelt-ийн үүрэгт тааруулсан.
import crypto from "node:crypto";
import { createSession, getStatus, newCode, verifyMode, type VerifyStatus } from "./verify-mn.js";

export const VERIFICATION_VALID_MINUTES = 60;
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_WINDOW_MS = 10 * 60_000;
export const IP_MAX = 10;
export const IP_WINDOW_MS = 10 * 60_000;

// signup — шинэ бүртгэл, reset — PIN/pattern сэргээх, phone — нэвтэрсэн хүн баталгаажуулах / солих
export type Purpose = "signup" | "reset" | "phone";
export type VerifyRole = "customer" | "courier";

export type StartError = "badPhone" | "phoneTaken" | "noAccount" | "cantReset" | "unavailable" | "tooMany";

export type StartResult =
  | { ok: true; id: string; code: string; shortcode: string; expiresAt: string; mock: boolean; smsUri: string }
  | { ok: false; error: StartError };

export interface AccountHit {
  role: "operator" | "courier" | "partner" | "customer";
  id: string;
}

export interface VerificationRow {
  id: string;
  phone: string;
  purpose: string;
  role: string | null;
  code: string;
  sessionId: string;
  userId: string | null;
  createdAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  usedAt: Date | null;
}

export interface PhoneDb {
  accountsByPhone(phone: string): Promise<AccountHit[]>;
  countRecent(phone: string, since: Date): Promise<number>;
  insert(row: VerificationRow): Promise<void>;
  get(id: string): Promise<VerificationRow | null>;
  markVerified(id: string, at: Date): Promise<void>;
  consume(id: string, phone: string, purpose: Purpose, since: Date, role?: string): Promise<boolean>;
  takeIpSlot(ip: string, windowMs: number, max: number): Promise<boolean>;
}

// Монгол дугаар 8 оронтой; зай, зураас, +976, эхний 0-г хасна
export function normalizePhone(raw: string) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length > 8 && digits.startsWith("976")) digits = digits.slice(3);
  if (digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function superadminPhone() {
  return normalizePhone(process.env.SUPERADMIN_PHONE || "99739959");
}

export function callbackUrl(id: string) {
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  return appUrl?.startsWith("https://") ? `${appUrl}/api/verify-callback?v=${id}` : undefined;
}

// SMS илгээхээс өмнө бүх шалгалтыг хийнэ — хэрэглэгч 150₮-өө дэмий төлөхгүй
export async function startVerification(
  db: PhoneDb,
  rawPhone: string,
  purpose: Purpose,
  opts: { role?: VerifyRole; selfUserId?: string; ip?: string } = {},
): Promise<StartResult> {
  const phone = normalizePhone(rawPhone);
  if (!/^\d{8}$/.test(phone)) return { ok: false, error: "badPhone" };

  if (opts.ip) {
    const allowed = await db.takeIpSlot(opts.ip, IP_WINDOW_MS, IP_MAX);
    if (!allowed) return { ok: false, error: "tooMany" };
  }

  if (phone === superadminPhone()) return { ok: false, error: "phoneTaken" };

  const hits = await db.accountsByPhone(phone);
  if (purpose === "signup") {
    if (hits.length) return { ok: false, error: "phoneTaken" };
  } else if (purpose === "phone") {
    if (!opts.selfUserId) return { ok: false, error: "unavailable" };
    if (hits.some((h) => h.id !== opts.selfUserId)) return { ok: false, error: "phoneTaken" };
  } else {
    const owner = hits.find((h) => h.role === "customer" || h.role === "courier");
    if (!owner) return { ok: false, error: hits.length ? "cantReset" : "noAccount" };
  }

  const mode = verifyMode();
  if (mode === "off") return { ok: false, error: "unavailable" };

  const recent = await db.countRecent(phone, new Date(Date.now() - ATTEMPT_WINDOW_MS));
  if (recent >= MAX_ATTEMPTS) return { ok: false, error: "tooMany" };

  const id = crypto.randomUUID();
  const code = newCode();
  let session;
  try {
    session = await createSession(phone, code, callbackUrl(id));
  } catch (e) {
    console.error("verify.mn createSession failed:", e);
    return { ok: false, error: "unavailable" };
  }
  const now = new Date();
  await db.insert({
    id,
    phone,
    purpose,
    role: purpose === "signup" ? opts.role ?? null : null,
    code: session.text,
    sessionId: session.sessionId,
    userId: purpose === "phone" ? opts.selfUserId ?? null : null,
    createdAt: now,
    expiresAt: session.expiresAt,
    verifiedAt: null,
    usedAt: null,
  });
  return {
    ok: true,
    id,
    code: session.text,
    shortcode: session.shortcode,
    expiresAt: session.expiresAt.toISOString(),
    mock: mode === "mock",
    smsUri: session.smsUri,
  };
}

export async function refreshVerification(db: PhoneDb, id: string): Promise<VerifyStatus> {
  const v = await db.get(id);
  if (!v) return "EXPIRED";
  if (v.verifiedAt) return "VERIFIED";
  if (v.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  let status: VerifyStatus;
  try {
    status = await getStatus(v.sessionId, v.createdAt);
  } catch {
    return "PENDING";
  }
  if (status === "VERIFIED") await db.markVerified(id, new Date());
  return status;
}

// Утас таарах, 60 минутын дотор баталгаажсан, хэрэглэгдээгүй. Нэг алхамд «хэрэглэсэн» болгоно.
export async function consumeVerification(db: PhoneDb, id: string, phone: string, purpose: Purpose, role?: string) {
  if (!id || id.length > 64) return false;
  const since = new Date(Date.now() - VERIFICATION_VALID_MINUTES * 60_000);
  return db.consume(id, normalizePhone(phone), purpose, since, purpose === "signup" ? role : undefined);
}
