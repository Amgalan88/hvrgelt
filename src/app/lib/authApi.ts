// Нэвтрэлтийн сервер (api/auth.ts) рүү хандах. PIN, нууц үгийг апп
// хэзээ ч DB-ээс уншиж харьцуулахгүй — зөвхөн сервер шалгана. Амжилттай
// бол Supabase session-ийг supabase клиентэд тавьж, дараагийн бүх
// хүсэлт (realtime ч мөн) хэрэглэгчийн эрхээр явна.

import { supabase } from "./supabase";

export type AuthRole = "superadmin" | "operator" | "courier" | "partner" | "customer";

export interface AuthResult {
  status: number;
  ok?: boolean;
  found?: boolean;
  role?: AuthRole;
  id?: string;
  name?: string;
  authMethod?: string;
  needsSetup?: boolean;
  session?: { access_token: string; refresh_token: string } | null;
  error?: string;
  attemptsLeft?: number;
  lockedUntil?: number;
}

async function call(action: string, body: Record<string, unknown>, withToken = false): Promise<AuthResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withToken) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  try {
    const res = await fetch("/api/auth", { method: "POST", headers, body: JSON.stringify({ action, ...body }) });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ...data };
  } catch {
    return { status: 0, error: "Сүлжээний алдаа гарлаа. Дахин оролдоно уу." };
  }
}

/** Серверээс ирсэн session-ийг тавина (байхгүй бол юу ч хийхгүй) */
export async function applySession(r: AuthResult) {
  if (r.session) await supabase.auth.setSession(r.session);
}

export const authLookup = (phone: string) => call("lookup", { phone });
export const authLogin = (phone: string, key: string) => call("login", { phone, key });
export const authSetup = (phone: string, oldKey: string, method: "pin" | "pattern", key: string) => call("setup", { phone, oldKey, method, key });
export const authRegister = (data: { role: "customer" | "courier"; name: string; phone: string; vehicle?: string; method: "pin" | "pattern"; key: string }) =>
  call("register", data);
export const authChange = (method: "pin" | "pattern", key: string) => call("change", { method, key }, true);
export const authAdminSet = (table: "operators" | "couriers" | "partners", id: string, password: string) =>
  call("admin-set", { table, id, password }, true);
export const authAdminReset = (id: string) => call("admin-reset", { id }, true);

export async function signOutSession() {
  await supabase.auth.signOut().catch(() => {});
}
