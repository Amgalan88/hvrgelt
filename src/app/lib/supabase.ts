import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Supabase тохиргоо дутуу байна. Төслийн үндсэн фолдерт .env файл үүсгээд " +
      "VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY-г оруулна уу. " +
      "Жишээг .env.example файлаас харна уу.",
  );
}

export const supabase = createClient(url, anonKey);
