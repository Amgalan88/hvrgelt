// Хөгжүүлэлтийн үеийн нээлттэй нэвтрэлт.
//
// Асаалттай үед нэг дэлгэцээс бүх role руу нууц үггүй орж болно —
// менежер, багийнхан хүссэн role-оо шалгах боломжтой.
//
// Хэзээ асах вэ:
//   • `npm run dev` (import.meta.env.DEV) — үргэлж асаалттай
//   • Байршуулсан хувилбарт .env дотор VITE_DEV_LOGIN=1 гэж бичсэн үед
//
// ⚠️ ХӨГЖҮҮЛЭЛТ ДУУСМАГЦ: .env-ээс VITE_DEV_LOGIN-ыг хасаад дахин
//    build хийнэ. Тэгмэл бүх хүн өөрийн role-оороо л нэвтэрнэ.

export function isDevLoginEnabled(): boolean {
  const flag = (import.meta.env.VITE_DEV_LOGIN as string | undefined)?.trim();
  if (flag === "0" || flag === "false") return false;   // явцуутгаж хаах
  return !!import.meta.env.DEV || flag === "1" || flag === "true";
}
