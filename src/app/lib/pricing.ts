// Байршлаар шууд үнэ бодох.
//
// Эхний ээлжинд зөвхөн "Бараа хүргэлт 20кг хүртэл" (goods). Үйлчлүүлэгч
// авах, хүргэх цэгээ газрын зураг дээр заасан бол үнэ шууд гарч, оператор
// үнэ тавихыг хүлээлгүй төлбөр рүү шилжинэ. Цэг заагаагүй бол өмнөх шигээ
// оператор үнийг тогтооно.
//
// Тарифыг супер админ "Тохиргоо → Шууд үнэ"-ээс оруулж асаана. Анхдагч
// төлөв нь УНТРААЛТТАЙ — бодит тариф оруулахаас өмнө үйлчлүүлэгчид
// зохиомол үнэ харагдахгүй.
//
// Зай: хоёр цэгийн шулуун зайг замын хэлбэрийн коэффициентээр (1.3)
// үржүүлнэ — хотын дотор замын бодит урттай ойролцоо. Google Routes API
// холбовол энэ хэсгийг бодит замын урт руу солино.

import { distanceKm, type LatLng } from "./geo";

export interface Tariff {
  /** Шууд үнэ идэвхтэй эсэх */
  enabled: boolean;
  /** Суурь үнэ — includedKm хүртэлх зайд */
  base: number;
  /** Суурь үнэд багтах зай (км) */
  includedKm: number;
  /** Түүнээс хэтэрсэн км тутам */
  perKm: number;
  /** "Яаралтай" сонгосон үед нэмэгдэх */
  urgentExtra: number;
}

/** Шууд үнэ ажиллах үйлчилгээнүүд */
export const AUTO_PRICE_SERVICES = ["goods"];

/** Шулуун зайг замын урт руу ойртуулах коэффициент */
export const ROAD_FACTOR = 1.3;
/** Үнийг бөөрөнхийлөх алхам (₮) */
export const ROUND_TO = 500;

/** Анхдагч — унтраалттай. Тоонууд нь зөвхөн маягтын жишээ. */
export const DEFAULT_TARIFF: Tariff = {
  enabled: false,
  base: 5000,
  includedKm: 3,
  perKm: 1000,
  urgentExtra: 2000,
};

export const TARIFF_SETTINGS_KEY = "tariff_goods";

export function parseTariff(raw?: string | null): Tariff {
  if (!raw) return DEFAULT_TARIFF;
  try {
    const t = JSON.parse(raw) as Partial<Tariff>;
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
    return {
      enabled: t.enabled === true,
      base: num(t.base, DEFAULT_TARIFF.base),
      includedKm: num(t.includedKm, DEFAULT_TARIFF.includedKm),
      perKm: num(t.perKm, DEFAULT_TARIFF.perKm),
      urgentExtra: num(t.urgentExtra, DEFAULT_TARIFF.urgentExtra),
    };
  } catch {
    return DEFAULT_TARIFF;
  }
}

/** Хоёр цэгийн хоорондох замын ойролцоо урт — апп даяар ижил тоо харагдана */
export function roadKm(from: LatLng, to: LatLng): number {
  return Math.round(distanceKm(from, to) * ROAD_FACTOR * 10) / 10;
}

export interface Quote {
  price: number;
  /** Тойм замын зай, 0.1 км нарийвчлалтай */
  km: number;
}

/** Зайгаар үнэ тооцох (тариф асаалттай эсэхийг шалгахгүй — цэвэр тооцоо) */
export function priceForKm(t: Tariff, km: number, urgent = false): number {
  const extraKm = Math.max(0, km - t.includedKm);
  const raw = t.base + Math.ceil(extraKm) * t.perKm + (urgent ? t.urgentExtra : 0);
  return Math.max(t.base, Math.ceil(raw / ROUND_TO) * ROUND_TO);
}

/**
 * Үйлчлүүлэгчид харуулах шууд үнэ. Тариф унтраалттай, үйлчилгээ дэмжигдээгүй,
 * эсвэл хоёр цэг заагаагүй бол null — оператор үнэ тавина.
 */
export function quoteDelivery(
  t: Tariff,
  serviceId: string | undefined,
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  urgent = false,
): Quote | null {
  if (!t.enabled || !serviceId || !AUTO_PRICE_SERVICES.includes(serviceId) || !from || !to) return null;
  const km = roadKm(from, to);
  return { km, price: priceForKm(t, km, urgent) };
}
