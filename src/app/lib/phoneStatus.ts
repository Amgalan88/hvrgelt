// 25.sql ажиллаагүй (багана байхгүй) бол баталгаажуулалтыг асаахгүй.
import { supabase } from "./supabase";

export type PhoneGateState = "unknown" | "ok" | "need" | "off" | "error";

function missingColumn(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" || /column .* does not exist|Could not find the/i.test(error.message ?? "");
}

export async function loadPhoneGate(role: "customer" | "courier", id: string): Promise<PhoneGateState> {
  const table = role === "customer" ? "customers" : "couriers";
  const { data, error } = await supabase.from(table).select("phone_verified_at").eq("id", id).maybeSingle();
  if (error) return missingColumn(error) ? "off" : "error";
  return data?.phone_verified_at ? "ok" : "need";
}
