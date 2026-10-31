// Байршлаар шууд үнэ бодох.
//
// Эхний ээлжинд зөвхөн "Бараа хүргэлт 20кг хүртэл" (goods). Үйлчлүүлэгч
// авах, хүргэх газраа сонгосон (байршилтай) бол үнэ шууд гарч, оператор
// үнэ тавихыг хүлээлгүй төлбөр рүү шилжинэ. Байршилгүй бол оператор үнэ
// тавина. Хүргэгч үнийн 80%-ийг авна (CourierApp).
//
// Томъёо:
//   захиалга (суурь) + км × км тутам — зайн урамшуулал:
//     нийт зай аль ангилалд орсноор БҮХ км-ийг тэр үнээр бодно
//     (жш: 3 км хүртэл ₮1,500/км, 10 км хүрэхгүй бол ₮1,200/км,
//      10 км ба түүнээс дээш ₮1,000/км — 9 км = 9 × ₮1,200).
//     Хилийн дараа үнэ өмнөх ангиллын дээд дүнгээс доош буухгүй (3.1 км ≥ 3 км).
//   + гараас гарт (орж авах, оруулж өгөх)
//   + яаралтай (20 минутын дотор)
//   + хэврэг
//   → км-ийн төлбөр ₮100-аар дээш бөөрөнхийлнө
//
// Зай: машины замын бодит урт (lib/route.ts — Google Routes, эсвэл OSRM).
// Маршрут олдохгүй бол хоёр цэгийн шулуун зай × 1.3 (хотын замын ойролцоо урт).
//
// Үнийг апп бодож захиалгад хадгална. DB (supabase/migrations/24.sql,
// guard_order) хуурамч бага үнийг татгалзана: доод хязгаар нь шулуун зай ×
// хамгийн хямд шатны км үнэ — тиймээс шатлалыг өөрчилсөн ч зөв үнэ хүлээгдэнэ.
//
// Тарифыг супер админ "Тохиргоо → Шууд үнэ"-ээс өөрчилж/унтрааж болно.

import { distanceKm, type LatLng } from "./geo";

export interface Tariff {
  /** Шууд үнэ идэвхтэй эсэх */
  enabled: boolean;
  /** Захиалга бүрийн суурь төлбөр */
  base: number;
  /** Км тутам — нийт зай tier1Km хүртэл бол */
  perKm: number;
  /** Богино зайны дээд хил (км, орно) */
  tier1Km: number;
  /** Км тутам — нийт зай tier2Km хүрэхгүй бол */
  perKm2: number;
  /** Хол зай эхлэх хил (км, орно) */
  tier2Km: number;
  /** Км тутам — нийт зай tier2Km ба түүнээс дээш бол */
  perKm3: number;
  /** Суурь төлбөрт багтах зай (км) — 0 бол эхний км-ээс тооцно */
  includedKm: number;
  /** Гараас гарт — орж авах, оруулж өгөх */
  handToHand: number;
  /** Яаралтай — 20 минутын дотор */
  urgentExtra: number;
  /** Хэврэг ачаа */
  fragileExtra: number;
}

/** Шууд үнэ ажиллах үйлчилгээнүүд */
export const AUTO_PRICE_SERVICES = ["goods"];

/**
 * Карт дээр харуулах «₮…-аас». Зөвхөн шууд үнэтэй үйлчилгээ, тариф
 * асаалттай, суурь төлбөр байгаа үед. Үнэ зохиохгүй.
 */
export function startingPrice(tariff: Pick<Tariff, "enabled" | "base"> | null | undefined, serviceId: string): number | null {
  if (!tariff?.enabled || !AUTO_PRICE_SERVICES.includes(serviceId) || !(tariff.base > 0)) return null;
  return tariff.base;
}

/** Шулуун зайг замын урт руу ойртуулах коэффициент */
export const ROAD_FACTOR = 1.3;
/** Үнийг бөөрөнхийлөх алхам (₮) */
export const ROUND_TO = 100;
/** Яаралтай хүргэлтийн амлалт (минут) */
export const URGENT_MINUTES = 20;

/** Бизнесийн тохирсон тариф (2026-10) */
export const DEFAULT_TARIFF: Tariff = {
  enabled: true,
  base: 1500,
  perKm: 1500,
  tier1Km: 3,
  perKm2: 1200,
  tier2Km: 10,
  perKm3: 1000,
  includedKm: 0,
  handToHand: 2000,
  urgentExtra: 1500,
  fragileExtra: 1000,
};

export const TARIFF_SETTINGS_KEY = "tariff_goods";

export function parseTariff(raw?: string | null): Tariff {
  if (!raw) return DEFAULT_TARIFF;
  try {
    const t = JSON.parse(raw) as Partial<Tariff>;
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
    return {
      enabled: typeof t.enabled === "boolean" ? t.enabled : DEFAULT_TARIFF.enabled,
      base: num(t.base, DEFAULT_TARIFF.base),
      perKm: num(t.perKm, DEFAULT_TARIFF.perKm),
      // Шатлал нэмэгдэхээс өмнө хадгалсан тарифт эдгээр байхгүй — анхдагчийг авна
      tier1Km: num(t.tier1Km, DEFAULT_TARIFF.tier1Km),
      perKm2: num(t.perKm2, DEFAULT_TARIFF.perKm2),
      tier2Km: num(t.tier2Km, DEFAULT_TARIFF.tier2Km),
      perKm3: num(t.perKm3, DEFAULT_TARIFF.perKm3),
      includedKm: num(t.includedKm, DEFAULT_TARIFF.includedKm),
      handToHand: num(t.handToHand, DEFAULT_TARIFF.handToHand),
      urgentExtra: num(t.urgentExtra, DEFAULT_TARIFF.urgentExtra),
      fragileExtra: num(t.fragileExtra, DEFAULT_TARIFF.fragileExtra),
    };
  } catch {
    return DEFAULT_TARIFF;
  }
}

/** Хоёр цэгийн хоорондох замын ойролцоо урт — апп даяар ижил тоо харагдана */
export function roadKm(from: LatLng, to: LatLng): number {
  return Math.round(distanceKm(from, to) * ROAD_FACTOR * 10) / 10;
}

export interface PriceExtras {
  handToHand?: boolean;
  urgent?: boolean;
  fragile?: boolean;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface Quote {
  price: number;
  /** Тойм замын зай, 0.1 км нарийвчлалтай */
  km: number;
  /** Задаргаа — нийлбэр нь price-тай тэнцүү */
  lines: QuoteLine[];
}

const roundUp = (v: number) => Math.ceil(v / ROUND_TO) * ROUND_TO;
const fmt = (n: number) => `₮${n.toLocaleString()}`;

/** Нийт зайнаас хамаарах км-ийн үнэ: богино (≤ tier1Km), дунд (< tier2Km), хол (≥ tier2Km) */
export function kmRate(t: Tariff, km: number): number {
  if (km <= t.tier1Km) return t.perKm;
  if (km < Math.max(t.tier1Km, t.tier2Km)) return t.perKm2;
  return t.perKm3;
}

/** Өмнөх ангиллын хамгийн их км-ийн төлбөр — хилээс цааш үнэ үүнээс доош буухгүй */
function kmChargeFloor(t: Tariff, km: number): number {
  const t1 = t.tier1Km, t2 = Math.max(t.tier1Km, t.tier2Km);
  const bill = (d: number) => Math.max(0, d - t.includedKm);
  if (km <= t1) return 0;
  if (km < t2) return roundUp(bill(t1) * t.perKm);
  return Math.max(roundUp(bill(t1) * t.perKm), roundUp(bill(t2) * t.perKm2));
}

/** Зайгаар үнэ ба задаргаа (тариф асаалттай эсэхийг шалгахгүй — цэвэр тооцоо) */
export function priceBreakdown(t: Tariff, km: number, extras: PriceExtras = {}): Quote {
  const lines: QuoteLine[] = [{ label: "Захиалга", amount: t.base }];
  // Зайн урамшуулал: нийт зай аль ангилалд орохоор бүх км нэг үнээр
  const total = Math.round(km * 10) / 10;
  const rate = kmRate(t, total);
  const billKm = Math.max(0, Math.round((total - t.includedKm) * 10) / 10);
  if (billKm > 0) {
    // Хилийн дараа хямд үнэ эхэлсэн ч өмнөх ангиллын дээд дүнгээс доош буухгүй —
    // 3.1 км нь 3 км-ээс хямд гарахгүй (цэгээ холдуулж үнэ бууруулахаас сэргийлнэ)
    const floor = kmChargeFloor(t, total);
    const charge = roundUp(billKm * rate);
    lines.push(
      charge >= floor
        ? { label: `${billKm.toFixed(1)} км × ${fmt(rate)}`, amount: charge }
        : { label: `${billKm.toFixed(1)} км`, amount: floor },
    );
  }
  if (extras.handToHand && t.handToHand > 0) lines.push({ label: "Гараас гарт", amount: t.handToHand });
  if (extras.urgent && t.urgentExtra > 0) lines.push({ label: "Яаралтай", amount: t.urgentExtra });
  if (extras.fragile && t.fragileExtra > 0) lines.push({ label: "Хэврэг", amount: t.fragileExtra });
  const price = lines.reduce((s, l) => s + l.amount, 0);
  return { price, km, lines };
}

export function priceForKm(t: Tariff, km: number, extras: PriceExtras = {}): number {
  return priceBreakdown(t, km, extras).price;
}

/**
 * Үйлчлүүлэгчид харуулах шууд үнэ. Тариф унтраалттай, үйлчилгээ дэмжигдээгүй,
 * эсвэл хоёр цэгийн байршил тодорхойгүй бол null — оператор үнэ тавина.
 */
export function quoteDelivery(
  t: Tariff,
  serviceId: string | undefined,
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  extras: PriceExtras = {},
  /** Машины замын бодит урт (км); байхгүй бол шулуун зай × 1.3 */
  routeKm?: number | null,
): Quote | null {
  if (!t.enabled || !serviceId || !AUTO_PRICE_SERVICES.includes(serviceId) || !from || !to) return null;
  return priceBreakdown(t, routeKm ?? roadKm(from, to), extras);
}
