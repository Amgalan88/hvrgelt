// phone_verifications хүснэгт — зөвхөн service role. RLS нээлттэй, policy байхгүй.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountHit, PhoneDb, VerificationRow } from "./phone-verification.js";

const TABLES = [
  ["operators", "operator"],
  ["couriers", "courier"],
  ["partners", "partner"],
  ["customers", "customer"],
] as const;

function rowOf(r: Record<string, unknown>): VerificationRow {
  return {
    id: String(r.id),
    phone: String(r.phone),
    purpose: String(r.purpose),
    role: r.role ? String(r.role) : null,
    code: String(r.code),
    sessionId: String(r.session_id),
    userId: r.user_id ? String(r.user_id) : null,
    createdAt: new Date(String(r.created_at)),
    expiresAt: new Date(String(r.expires_at)),
    verifiedAt: r.verified_at ? new Date(String(r.verified_at)) : null,
    usedAt: r.used_at ? new Date(String(r.used_at)) : null,
  };
}

export function supabasePhoneDb(db: SupabaseClient): PhoneDb {
  return {
    async accountsByPhone(phone) {
      const found = await Promise.all(
        TABLES.map(async ([table, role]) => {
          const { data, error } = await db.from(table).select("id").eq("phone", phone).limit(1);
          if (error) throw error;
          const id = data?.[0]?.id;
          return id ? ({ role, id: String(id) } as AccountHit) : null;
        }),
      );
      return found.filter((x): x is AccountHit => !!x);
    },
    async countRecent(phone, since) {
      const { count, error } = await db
        .from("phone_verifications")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    async insert(row) {
      const { error } = await db.from("phone_verifications").insert({
        id: row.id,
        phone: row.phone,
        purpose: row.purpose,
        role: row.role,
        code: row.code,
        session_id: row.sessionId,
        user_id: row.userId,
        created_at: row.createdAt.toISOString(),
        expires_at: row.expiresAt.toISOString(),
        verified_at: null,
        used_at: null,
      });
      if (error) throw error;
    },
    async get(id) {
      const { data, error } = await db.from("phone_verifications").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? rowOf(data) : null;
    },
    async markVerified(id, at) {
      const { error } = await db
        .from("phone_verifications")
        .update({ verified_at: at.toISOString() })
        .eq("id", id)
        .is("verified_at", null);
      if (error) throw error;
    },
    async consume(id, phone, purpose, since, role) {
      let q = db
        .from("phone_verifications")
        .update({ used_at: new Date().toISOString() })
        .eq("id", id)
        .eq("phone", phone)
        .eq("purpose", purpose)
        .is("used_at", null)
        .not("verified_at", "is", null)
        .gte("verified_at", since.toISOString());
      if (purpose === "signup" && role) q = q.eq("role", role);
      const { data, error } = await q.select("id");
      if (error) throw error;
      return (data?.length ?? 0) === 1;
    },
    async takeIpSlot(ip, windowMs, max) {
      const now = Date.now();
      const { data, error } = await db.from("phone_verify_ip").select("count, window_start").eq("ip", ip).maybeSingle();
      if (error) throw error;
      const start = data?.window_start ? new Date(data.window_start).getTime() : 0;
      if (!data || now - start >= windowMs) {
        const { error: upErr } = await db.from("phone_verify_ip").upsert({
          ip,
          count: 1,
          window_start: new Date(now).toISOString(),
        });
        if (upErr) throw upErr;
        return true;
      }
      if ((data.count ?? 0) >= max) return false;
      const { error: upErr } = await db
        .from("phone_verify_ip")
        .update({ count: (data.count ?? 0) + 1 })
        .eq("ip", ip);
      if (upErr) throw upErr;
      return true;
    },
  };
}

// Хүснэгт үүссэн үед л баталгаажуулалт заавал. 25.sql ажиллаагүй бол нэвтрэлт хуучин хэвээр.
let readyCache: boolean | null = null;
export async function phoneVerifyReady(db: SupabaseClient): Promise<boolean> {
  if (readyCache === true) return true;
  const { error } = await db.from("phone_verifications").select("id").limit(1);
  if (!error) {
    readyCache = true;
    return true;
  }
  const msg = `${error.code ?? ""} ${error.message ?? ""}`;
  if (error.code === "PGRST205" || error.code === "42P01" || /phone_verifications|schema cache|does not exist|Could not find the table/i.test(msg)) {
    return false;
  }
  throw error;
}

export function __resetPhoneVerifyCache() {
  readyCache = null;
}
