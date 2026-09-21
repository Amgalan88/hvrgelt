// Үндсэн үйлчилгээнүүд — хэрэглэгчийн эхний дэлгэц дээр харагдана.
//
// Гурван түвшин:
//   1. Үйлчилгээ (SERVICES)          — бараа хүргэлт, крантай машин, ...
//   2. Дэд төрөл (service.subs)      — карго, тээш, олон ширхэгтэй, ...
//   3. Ачааны мэдээлэл               — зураг, кг, хагарах, яаралтай
//      (needsCargo = true үйлчилгээнд л асууна)
//
// Шинэ үйлчилгээ нэмэхдээ энэ жагсаалтад нэг мөр нэмэхэд хангалттай.
// `id` нь DB-д (orders.service_id / sub_service_id) хадгалагдана —
// нэг удаа өгсөн id-г бүү өөрчил.

export interface SubService {
  id: string;
  label: string;
  desc?: string;
}

export interface Service {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  notePlaceholder: string;
  /** Ачааны зураг/жин/хагарах/яаралтай асуух эсэх */
  needsCargo: boolean;
  subs: SubService[];
}

// Ачааны машинуудад давтагдах дэд төрлүүд
const LOAD_SUBS: SubService[] = [
  { id: "many",     label: "Олон ширхэгтэй",    desc: "Хэд хэдэн ачаа, ачих буулгах удаан" },
  { id: "few",      label: "Цөөн ширхэгтэй",    desc: "1–3 ширхэг ачаа" },
  { id: "handcarry", label: "Гараас гарт зөөхөөр", desc: "Зөөж ачих шаардлагатай" },
  { id: "negotiate", label: "Тохиролцох",        desc: "Оператортой ярилцаж тохирно" },
];

export const SERVICES: Service[] = [
  {
    id: "goods",
    label: "Бараа хүргэлт 20кг хүртэл",
    emoji: "📦",
    desc: "Жижиг илгээмж, баглаа боодол",
    notePlaceholder: "Юу хүргэх вэ? — хэмжээ, эмзэг эсэх...",
    needsCargo: true,
    subs: [
      { id: "cargo",    label: "Карго",           desc: "Каргоны илгээмж авах" },
      { id: "luggage",  label: "Тээш",            desc: "Тээшийн ачаа" },
      { id: "grocery",  label: "Хүнсний дэлгүүр", desc: "Хүнсний бараа авах" },
      { id: "shop",     label: "Барааны дэлгүүр", desc: "Барааны дэлгүүрээс авах" },
      { id: "hand",     label: "Гараас гарт",     desc: "Шууд гардуулж өгөх" },
      { id: "express",  label: "Онцгой хурдан",   desc: "Бусдаас түрүүлж хүргэнэ" },
    ],
  },
  {
    id: "goods-heavy",
    label: "Бараа хүргэлт 20кг дээш",
    emoji: "🧳",
    desc: "Хүнд, овор ихтэй ачаа",
    notePlaceholder: "Ачааны хэмжээ, жин, ачих нөхцөл...",
    needsCargo: true,
    subs: LOAD_SUBS,
  },
  {
    id: "truck-2t",
    label: "2 хүртэл тонн ачааны машин",
    emoji: "🚚",
    desc: "Портер, жижиг ачааны машин",
    notePlaceholder: "Ачааны төрөл, ачигч хэрэгтэй эсэх, давхар...",
    needsCargo: true,
    subs: LOAD_SUBS,
  },
  {
    id: "truck-big",
    label: "2 тонн дээш ачааны машин",
    emoji: "🚛",
    desc: "Том оврын ачааны тээвэр",
    notePlaceholder: "Ачааны төрөл, жин, ачих буулгах нөхцөл...",
    needsCargo: true,
    subs: LOAD_SUBS,
  },
  {
    id: "kids",
    label: "Хүүхэд хүргэлт",
    emoji: "🧒",
    desc: "Хүүхдийг сургууль, гэрт нь хүргэнэ",
    notePlaceholder: "Хүүхдийн нас, хэн хүлээж авах, утасны дугаар...",
    needsCargo: false,
    subs: [],
  },
  {
    id: "crane",
    label: "Крантай машин",
    emoji: "🏗️",
    desc: "Хүнд ачаа өргөх, буулгах",
    notePlaceholder: "Ачааны жин, өндөр, ажлын хугацаа...",
    needsCargo: true,
    subs: [],
  },
  {
    id: "vacuum",
    label: "Бохир соруулах машин",
    emoji: "🚽",
    desc: "Жорлон, бохирын нүх соруулах",
    notePlaceholder: "Хэдэн куб, байршил, орох зам...",
    needsCargo: false,
    subs: [],
  },
  {
    id: "excavator",
    label: "Экскаватор",
    emoji: "🚜",
    desc: "Ухах, зөөх, цэвэрлэх ажил",
    notePlaceholder: "Ажлын төрөл, талбайн хэмжээ, хугацаа...",
    needsCargo: false,
    subs: [],
  },
  {
    id: "bobcat",
    label: "Бобкат",
    emoji: "🛻",
    desc: "Цас, хог цэвэрлэх, жижиг ухалт",
    notePlaceholder: "Ажлын төрөл, талбайн хэмжээ, хугацаа...",
    needsCargo: false,
    subs: [],
  },
];

// Хуучин id-ууд (migration 11-ийн үеийн 5 үйлчилгээ) — өмнөх захиалгууд
// хоосон харагдахгүйн тулд шинэ үйлчилгээ рүү хөрвүүлнэ.
const LEGACY_IDS: Record<string, string> = {
  market: "goods",      // "Захаас бараа авах" → бараа хүргэлт 20кг хүртэл
  porter: "truck-2t",   // "Портер ачигчтай"   → 2 хүртэл тонн
};

export function serviceById(id?: string): Service | undefined {
  if (!id) return undefined;
  const key = LEGACY_IDS[id] ?? id;
  return SERVICES.find((s) => s.id === key);
}

export function subServiceById(serviceId?: string, subId?: string): SubService | undefined {
  if (!serviceId || !subId) return undefined;
  return serviceById(serviceId)?.subs.find((s) => s.id === subId);
}

/** Оператор/жолоочид харуулах бүтэн нэр: "Бараа хүргэлт 20кг хүртэл · Карго" */
export function serviceLabel(serviceId?: string, subId?: string): string {
  const s = serviceById(serviceId);
  if (!s) return "";
  const sub = subServiceById(serviceId, subId);
  return sub ? `${s.label} · ${sub.label}` : s.label;
}
