import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (k: string) => process.env[k]?.trim() || "";

export function supabaseUrl() {
  return env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

export function adminClient(): SupabaseClient {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl() || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY тохируулаагүй байна");
  return createClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
