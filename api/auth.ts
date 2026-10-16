// hvrgelt — Нэвтрэлт (Vercel Function)
//
// PIN, зурган түгжээ, нэг удаагийн нууц үгийг ЗӨВХӨН сервер шалгана.
// Апп нууц утгыг хэзээ ч уншихгүй. Амжилттай бол Supabase Auth-ийн жинхэнэ
// session (SMS-гүй) буцаана — RLS үүгээр хэн, ямар үүрэгтэйг таньна
// (app_metadata.app_role, app_metadata.account_id).
//
//   POST /api/auth  { action: "lookup",   phone }
//   POST /api/auth  { action: "login",    phone, key }
//   POST /api/auth  { action: "setup",    phone, oldKey?, method, key }   — анхны / сэргээсэн нууцлал
//   POST /api/auth  { action: "register", role: "customer"|"courier", name, phone, vehicle?, method, key }
//   POST /api/auth  { action: "change",   method, key }                  — Authorization: Bearer <access_token>
//   POST /api/auth  { action: "admin-set", table, id, password }         — супер админ: нэг удаагийн нууц үг
//   POST /api/auth  { action: "admin-reset", id }                        — супер админ: захиалагчийн PIN цэвэрлэх
//
// Vercel → Environment Variables (VITE_ угтваргүй, нууц):
//   AUTH_SECRET            — урт санамсаргүй утга (Supabase session-д)
//   SUPERADMIN_PASSWORD    — супер админы нууц үг (кодонд биш)
//   SUPERADMIN_PHONE       — супер админы дугаар (тохируулаагүй бол хуучин дугаар)
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const env = (k: string) => process.env[k]?.trim() || "";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const SUPABASE_URL = () => env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
const SUPERADMIN = { id: "sa1", name: "Супер Админ" };

function admin(): SupabaseClient {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL() || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY тохируулаагүй байна");
  return createClient(SUPABASE_URL(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function publicClient(): SupabaseClient {
  const key = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  return createClient(SUPABASE_URL(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const normalizePhone = (p: string) => String(p ?? "").replace(/\D/g, "").replace(/^976(?=\d{8}$)/, "");

// ── Нууц утга: scrypt hash ─────────────────────────────────────────────
// Хуучин (энгийн текст) утгыг нэвтрэх үед нь hash болгож шинэчилнэ.
const HASH_PREFIX = "s1$";
export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 32);
  return `${HASH_PREFIX}${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored || !secret) return false;
  if (stored.startsWith(HASH_PREFIX)) {
    const [, salt, hash] = stored.split("$");
    const expected = Buffer.from(hash, "base64url");
    const got = scryptSync(secret, Buffer.from(salt, "base64url"), expected.length);
    return timingSafeEqual(expected, got);
  }
  const a = Buffer.from(secret), b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}
const isHashed = (s?: string | null) => !!s && s.startsWith(HASH_PREFIX);

// ── Буруу оролдлогын хязгаар ──────────────────────────────────────────
// 5 удаа буруу → 10 минут түгжинэ. Функцийн instance бүрт санах ойд;
// найдвартай хязгаарыг migration 22-ийн auth_attempts хүснэгт хийнэ.
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60_000;
const memAttempts = new Map<string, { count: number; until: number }>();

async function attemptsFor(db: SupabaseClient, phone: string) {
  const { data, error } = await db.from("auth_attempts").select("count, locked_until").eq("phone", phone).maybeSingle();
  if (error) return memAttempts.get(phone) ?? { count: 0, until: 0 };
  return { count: data?.count ?? 0, until: data?.locked_until ? new Date(data.locked_until).getTime() : 0 };
}
async function recordAttempt(db: SupabaseClient, phone: string, ok: boolean) {
  const cur = await attemptsFor(db, phone);
  const count = ok ? 0 : cur.count + 1;
  const until = !ok && count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
  memAttempts.set(phone, { count: until ? 0 : count, until });
  await db
    .from("auth_attempts")
    .upsert({ phone, count: until ? 0 : count, locked_until: until ? new Date(until).toISOString() : null, updated_at: new Date().toISOString() })
    .then(() => {}, () => {});
  return { count, until };
}

// ── Бүртгэл хайх ─────────────────────────────────────────────────────
type Role = "superadmin" | "operator" | "courier" | "partner" | "customer";
interface Account {
  role: Role;
  table: "operators" | "couriers" | "partners" | "customers" | null;
  id: string;
  name: string;
  authMethod: string;
  secret: string | null;
}

async function findAccount(db: SupabaseClient, phone: string): Promise<Account | null> {
  if (phone && phone === normalizePhone(env("SUPERADMIN_PHONE") || "99739959")) {
    return { role: "superadmin", table: null, id: SUPERADMIN.id, name: SUPERADMIN.name, authMethod: "password", secret: null };
  }
  const pick = "id, name, auth_method, auth_key";
  const { data: op, error: e1 } = await db.from("operators").select(pick).eq("phone", phone).eq("active", true).limit(1);
  if (e1) throw e1;
  if (op?.[0]) return { role: "operator", table: "operators", id: op[0].id, name: op[0].name, authMethod: op[0].auth_method, secret: op[0].auth_key };
  const { data: cr, error: e2 } = await db.from("couriers").select(pick).eq("phone", phone).eq("active", true).limit(1);
  if (e2) throw e2;
  if (cr?.[0]) return { role: "courier", table: "couriers", id: cr[0].id, name: cr[0].name, authMethod: cr[0].auth_method, secret: cr[0].auth_key };
  const { data: pr } = await db.from("partners").select(pick).eq("phone", phone).eq("active", true).limit(1);
  if (pr?.[0]?.auth_key) return { role: "partner", table: "partners", id: pr[0].id, name: pr[0].name, authMethod: pr[0].auth_method ?? "password", secret: pr[0].auth_key };
  const { data: cu, error: e4 } = await db.from("customers").select(pick).eq("phone", phone).limit(1);
  if (e4) throw e4;
  if (cu?.[0]) return { role: "customer", table: "customers", id: cu[0].id, name: cu[0].name, authMethod: cu[0].auth_method, secret: cu[0].auth_key };
  return null;
}

/**
 * Супер админы дугаар өөр бүртгэлд давхцаж байвал супер админ давуу:
 * тэр бүртгэлийн утсанд "-хуучин" нэмж чөлөөлнө (устгахгүй — захиалгын
 * түүх, мэдээлэл хэвээр, админ хүсвэл дугаарыг нь засна).
 */
async function releasePhoneForSuperadmin(db: SupabaseClient, phone: string) {
  for (const table of ["operators", "couriers", "partners", "customers"]) {
    const { error } = await db.from(table).update({ phone: `${phone}-хуучин` }).eq("phone", phone);
    if (error) console.error("releasePhone", table, error.message);
  }
}

async function storeSecret(db: SupabaseClient, table: string, id: string, method: string, secret: string) {
  const hashed = method === "reset" ? "" : hashSecret(secret);
  const patch: Record<string, unknown> = { auth_method: method, auth_key: hashed };
  // operators, couriers хүснэгтийн хуучин "password" багана — энгийн текст үлдээхгүй
  if (table === "operators" || table === "couriers") patch.password = hashed;
  const { error } = await db.from(table).update(patch).eq("id", id);
  if (error) throw error;
}

// ── Supabase session ──────────────────────────────────────────────────
// Бүртгэл бүрт нэг Supabase Auth хэрэглэгч (имэйл нь дотоод, хэрэглэгчид
// харагдахгүй). Нууц үг нь AUTH_SECRET-ээс гаргасан, серверээс гардаггүй.
async function issueSession(db: SupabaseClient, role: Role, id: string) {
  // Session үүсгэж чадахгүй байсан ч нэвтрэлтийг саатуулахгүй (RLS хаагдах хүртэл)
  try {
    return await createSession(db, role, id);
  } catch (err) {
    console.error("issueSession", err);
    return null;
  }
}

async function createSession(db: SupabaseClient, role: Role, id: string) {
  const secret = env("AUTH_SECRET");
  if (!secret) return null;
  const email = `${role}.${id}`.toLowerCase().replace(/[^a-z0-9.-]/g, "-") + "@users.hvrgelt.mn";
  const password = createHmac("sha256", secret).update(email).digest("base64url");
  const app_metadata = { app_role: role, account_id: id };
  const pub = publicClient();
  let { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true, app_metadata });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;
    ({ data, error } = await pub.auth.signInWithPassword({ email, password }));
    if (error) throw error;
  }
  const meta = data.user?.app_metadata ?? {};
  if (meta.app_role !== role || meta.account_id !== id) {
    // Үүрэг өөрчлөгдсөн бол (жишээ нь захиалагч → хүргэгч биш) metadata шинэчилж дахин нэвтэрнэ
    await db.auth.admin.updateUserById(data.user!.id, { app_metadata });
    ({ data, error } = await pub.auth.signInWithPassword({ email, password }));
    if (error) throw error;
  }
  const s = data.session!;
  return { access_token: s.access_token, refresh_token: s.refresh_token };
}

/** Bearer токеноос хэн болохыг шалгана */
async function caller(db: SupabaseClient, request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  const meta = data.user?.app_metadata ?? {};
  return meta.app_role ? { role: meta.app_role as Role, id: String(meta.account_id) } : null;
}

const validKey = (method: string, key: string) =>
  method === "pin" ? /^\d{4,6}$/.test(key) : method === "pattern" ? /^[0-8](-?[0-8]){3,8}$/.test(key) || key.length >= 4 : false;

// ── Үйлдлүүд ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

async function lookup(db: SupabaseClient, b: Body) {
  const phone = normalizePhone(b.phone);
  if (phone.length !== 8) return json({ error: "Утасны дугаар 8 оронтой байх ёстой" }, 400);
  const acc = await findAccount(db, phone);
  if (!acc) return json({ found: false });
  return json({ found: true, role: acc.role, id: acc.id, name: acc.name, authMethod: acc.authMethod });
}

async function login(db: SupabaseClient, b: Body) {
  const phone = normalizePhone(b.phone);
  const key = String(b.key ?? "");
  const lock = await attemptsFor(db, phone);
  if (lock.until > Date.now()) return json({ error: "Олон удаа буруу оруулсан. Түр хүлээгээд дахин оролдоно уу.", lockedUntil: lock.until }, 429);

  const acc = await findAccount(db, phone);
  if (!acc) return json({ error: "Бүртгэл олдсонгүй" }, 404);

  let ok: boolean;
  if (acc.role === "superadmin") {
    const pw = env("SUPERADMIN_PASSWORD");
    if (!pw) return json({ error: "SUPERADMIN_PASSWORD тохируулаагүй байна" }, 501);
    ok = verifySecret(key, pw);
  } else {
    ok = acc.authMethod !== "reset" && verifySecret(key, acc.secret);
  }
  const r = await recordAttempt(db, phone, ok);
  if (!ok) {
    return json(
      { error: r.until ? "5 удаа буруу оруулсан. 10 минут хүлээнэ үү." : "Буруу байна", attemptsLeft: Math.max(0, MAX_ATTEMPTS - r.count), lockedUntil: r.until || undefined },
      401,
    );
  }
  if (acc.role === "superadmin") await releasePhoneForSuperadmin(db, phone);
  // Хуучин энгийн текстийг hash болгоно
  if (acc.table && !isHashed(acc.secret)) await storeSecret(db, acc.table, acc.id, acc.authMethod, key);
  // Ажилтан анх нэг удаагийн нууц үгээр орсон бол өөрийн PIN тохируулна
  if (acc.authMethod === "password" && acc.role !== "superadmin" && acc.role !== "partner") {
    return json({ ok: true, needsSetup: true, role: acc.role, id: acc.id, name: acc.name });
  }
  const session = await issueSession(db, acc.role, acc.id);
  return json({ ok: true, role: acc.role, id: acc.id, name: acc.name, authMethod: acc.authMethod, session });
}

async function setup(db: SupabaseClient, b: Body) {
  const phone = normalizePhone(b.phone);
  const method = String(b.method), key = String(b.key ?? "");
  if (!validKey(method, key)) return json({ error: "PIN эсвэл зурган түгжээ буруу хэлбэртэй" }, 400);
  const acc = await findAccount(db, phone);
  if (!acc || !acc.table) return json({ error: "Бүртгэл олдсонгүй" }, 404);
  // "reset" — админ утсаар баталгаажуулж цэвэрлэсэн; "password" — нэг удаагийн нууц үг заавал
  if (acc.authMethod === "password") {
    const r = await attemptsFor(db, phone);
    if (r.until > Date.now()) return json({ error: "Түр хүлээгээд дахин оролдоно уу." }, 429);
    const ok = verifySecret(String(b.oldKey ?? ""), acc.secret);
    await recordAttempt(db, phone, ok);
    if (!ok) return json({ error: "Нэг удаагийн нууц үг буруу" }, 401);
  } else if (acc.authMethod !== "reset") {
    return json({ error: "Нууцлал аль хэдийн тохируулсан байна" }, 409);
  }
  await storeSecret(db, acc.table, acc.id, method, key);
  if (acc.table !== "customers") await db.from(acc.table).update({ active: true }).eq("id", acc.id);
  const session = await issueSession(db, acc.role, acc.id);
  return json({ ok: true, role: acc.role, id: acc.id, name: acc.name, authMethod: method, session });
}

async function register(db: SupabaseClient, b: Body) {
  const phone = normalizePhone(b.phone);
  const name = String(b.name ?? "").trim().slice(0, 80);
  const method = String(b.method), key = String(b.key ?? "");
  const role = b.role === "courier" ? "courier" : "customer";
  if (phone.length !== 8 || !name) return json({ error: "Нэр, утасны дугаараа шалгана уу" }, 400);
  if (!validKey(method, key)) return json({ error: "PIN эсвэл зурган түгжээ буруу хэлбэртэй" }, 400);
  if (await findAccount(db, phone)) return json({ error: "Энэ дугаар аль хэдийн бүртгэлтэй байна. Нэвтэрч орно уу." }, 409);

  const today = new Date().toISOString().slice(0, 10);
  const hashed = hashSecret(key);
  const id = (role === "courier" ? "cr-" : "cu-") + randomBytes(6).toString("hex");
  const vehicles = ["явган", "дугуй", "мопед", "мотоцикл", "автомашин"];
  const row: Record<string, unknown> =
    role === "courier"
      ? {
          id, name, phone, username: phone, password: hashed, auth_method: method, auth_key: hashed,
          vehicle: vehicles.includes(b.vehicle) ? b.vehicle : "явган",
          available: false, rating: 5.0, total_deliveries: 0, today_deliveries: 0, created_at: today, active: true, verified: false,
        }
      : { id, name, phone, auth_method: method, auth_key: hashed, created_at: today };
  const { error } = await db.from(role === "courier" ? "couriers" : "customers").insert(row);
  if (error) {
    if (error.code === "23505") return json({ error: "Энэ дугаар аль хэдийн бүртгэлтэй байна. Нэвтэрч орно уу." }, 409);
    throw error;
  }
  const session = await issueSession(db, role, id);
  return json({ ok: true, role, id, name, authMethod: method, session });
}

async function change(db: SupabaseClient, request: Request, b: Body) {
  const who = await caller(db, request);
  if (!who) return json({ error: "Дахин нэвтэрнэ үү" }, 401);
  const method = String(b.method), key = String(b.key ?? "");
  if (!validKey(method, key)) return json({ error: "PIN эсвэл зурган түгжээ буруу хэлбэртэй" }, 400);
  const table = { customer: "customers", courier: "couriers", operator: "operators" }[who.role as string];
  if (!table) return json({ error: "Энэ үүрэгт боломжгүй" }, 403);
  await storeSecret(db, table, who.id, method, key);
  return json({ ok: true });
}

async function adminSet(db: SupabaseClient, request: Request, b: Body) {
  const who = await caller(db, request);
  if (who?.role !== "superadmin") return json({ error: "Зөвхөн супер админ" }, 403);
  const table = String(b.table);
  if (!["operators", "couriers", "partners"].includes(table)) return json({ error: "table буруу" }, 400);
  const password = String(b.password ?? "");
  if (password.length < 4) return json({ error: "Нууц үг хэт богино" }, 400);
  await storeSecret(db, table, String(b.id), "password", password);
  return json({ ok: true });
}

async function adminReset(db: SupabaseClient, request: Request, b: Body) {
  const who = await caller(db, request);
  if (who?.role !== "superadmin") return json({ error: "Зөвхөн супер админ" }, 403);
  await storeSecret(db, "customers", String(b.id), "reset", "");
  return json({ ok: true });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "POST шаардлагатай" }, 405);
    try {
      const b: Body = await request.json().catch(() => ({}));
      const db = admin();
      switch (b.action) {
        case "lookup": return await lookup(db, b);
        case "login": return await login(db, b);
        case "setup": return await setup(db, b);
        case "register": return await register(db, b);
        case "change": return await change(db, request, b);
        case "admin-set": return await adminSet(db, request, b);
        case "admin-reset": return await adminReset(db, request, b);
        default: return json({ error: "unknown action" }, 404);
      }
    } catch (err) {
      console.error("auth", err);
      return json({ error: "Серверийн алдаа. Дахин оролдоно уу." }, 500);
    }
  },
};
