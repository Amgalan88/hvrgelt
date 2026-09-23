// Хөгжүүлэгчийн бүртгэл.
//
// Энэ бүртгэлээр нэвтэрвэл role сонгох дэлгэц нээгдэж, бүх role руу
// (үйлчлүүлэгч, жолооч, оператор, партнёр, супер админ) нууц үг дахин
// асуухгүйгээр шилжиж, шалгах боломжтой болно.
//
// Нэвтрэх нь ердийн урсгалаараа: утасны дугаар → нууц үг. 5 удаа буруу
// оруулбал ердийн бүртгэлийн адил 10 минут түгждэг.
//
// Тохиргоо (.env):
//   VITE_DEV_PHONE=99000000     ← дугаараа солих бол
//   VITE_DEV_PASSWORD=<нууц үг> ← ЗААВАЛ. Үүнгүй бол бүртгэл хаалттай.
//
// ⚠️ Байршуулсан (production) хувилбарт VITE_DEV_PASSWORD байхгүй бол
//    энэ бүртгэл огт ажиллахгүй. Хөгжүүлэлт дуусмагц .env-ээс хасаад
//    дахин build хийхэд бүх хүн өөрийн role-оороо л нэвтэрнэ.

import { normalizePhone } from "./phone";

/** Нэвтрэх дэлгэц дээр харагдах нэр */
export const DEV_ACCOUNT_NAME = "Хөгжүүлэгч";

/** Dev горимд орсныг санах localStorage түлхүүр */
export const DEV_UNLOCK_KEY = "hvrgelt_dev";

const ENV_PHONE    = (import.meta.env.VITE_DEV_PHONE as string | undefined)?.trim();
const ENV_PASSWORD = (import.meta.env.VITE_DEV_PASSWORD as string | undefined)?.trim();

// `npm run dev` үед .env тохируулаагүй ч ажиллах анхны утга.
// Байршуулсан хувилбарт энэ утгууд хэрэглэгддэггүй.
const FALLBACK_PHONE    = "99000000";
const FALLBACK_PASSWORD = "dev1961";

/** Хөгжүүлэгчийн дугаар (DB-тэй ижил стандартад оруулсан) */
export function devPhone(): string {
  return normalizePhone(ENV_PHONE || FALLBACK_PHONE);
}

/** Нууц үг — тохируулаагүй бол production дээр null (= бүртгэл хаалттай) */
function devPassword(): string | null {
  if (ENV_PASSWORD) return ENV_PASSWORD;
  if (import.meta.env.DEV) return FALLBACK_PASSWORD;
  return null;
}

export function isDevAccountEnabled(): boolean {
  return devPassword() !== null;
}

/** Оруулсан дугаар хөгжүүлэгчийнх эсэх */
export function isDevPhone(raw: string): boolean {
  return isDevAccountEnabled() && normalizePhone(raw) === devPhone();
}

export function checkDevPassword(entered: string): boolean {
  const pw = devPassword();
  return pw !== null && entered === pw;
}
