// Verify.MN SMS ирэхэд биегүй GET илгээнэ. Зөвхөн дохио —
// бодит төлөвийг Verify.MN-ээс дахин асуудаг тул хуурамч дуудлага юу ч батлахгүй.

import { phoneVerifyReady, supabasePhoneDb } from "../server/phone-db.js";
import { refreshVerification } from "../server/phone-verification.js";
import { adminClient } from "../server/supabase-admin.js";

export default {
  async fetch(request: Request) {
    const id = new URL(request.url).searchParams.get("v") ?? "";
    if (request.method === "GET" && id && id.length <= 64) {
      try {
        const db = adminClient();
        if (await phoneVerifyReady(db)) await refreshVerification(supabasePhoneDb(db), id);
      } catch (err) {
        console.error("verify-callback", err);
      }
    }
    return Response.json({ ok: true });
  },
};
