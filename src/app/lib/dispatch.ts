// Хүргэгчид захиалгын санал илгээх — хамгийн ойрынх нь эхэнд.
//
// Захиалга төлөгдөж "хүргэгч хайж байна" болмогц:
//   • ажилд гарсан (available), идэвхтэй, баримт нь баталгаажсан, сүүлийн
//     10 минутад байршлаа илгээсэн хүргэгчдийг авах цэгт ойрын дарааллаар эрэмбэлнэ
//   • эхний 4 хүргэгчид санал очно (push + апп дотор дуут дохио)
//   • 2 минутад хэн ч авахгүй бол дараагийн 4-т нэмж очно, гэх мэт
//   • нэг нь "Авах" дармагц DB дээр нөхцөлтэй шинэчлэлтээр (status +
//     courier_id is null) өөрт нь бүртгэгдэж, бусдаас алга болно — хоёр
//     хүргэгч зэрэг дарсан ч зөвхөн нэг нь авна
//
// Явган, дугуй хүргэгчид хүрэх зайгаас (VEHICLE_REACH) хол захиалгын санал
// очихгүй: авах цэг хол, эсвэл хүргэх зам урт бол алгасна.
//
// Авах цэгийн байршилгүй захиалгад (оператор үнэ тавьсан г.м.) ажилд
// гарсан бүх хүргэгчид санал очно. Оператор гараар томилж болсоор байна.
//
// Энэ эрэмбийг хүргэгч бүрийн апп ижил өгөгдлөөс тооцдог тул хүн бүр ижил
// дүгнэлтэд хүрнэ; push-ийг send-order-notification функц ижил дүрмээр илгээнэ.

import { distanceKm, type LatLng } from "./geo";

export const OFFER_BATCH = 4;
export const WAVE_MS = 2 * 60_000;
export const LOCATION_FRESH_MS = 10 * 60_000;

/** Моторгүй хүргэгчийн хүрэх зай (км): авах цэг хүртэл, авах → хүргэх зам */
export const VEHICLE_REACH: Record<string, { pickupKm: number; tripKm: number }> = {
  явган: { pickupKm: 1.5, tripKm: 3 },
  дугуй: { pickupKm: 4, tripKm: 8 },
};

export interface DispatchCourier {
  id: string;
  available: boolean;
  active: boolean;
  verified: boolean;
  /** Тээврийн хэрэгсэл — явган, дугуй бол хүрэх зай хязгаартай */
  vehicle?: string;
  pos?: LatLng;
  /** Байршил сүүлд шинэчлэгдсэн ISO цаг */
  locAt?: string;
}

export interface DispatchOrder {
  pickup: LatLng | null;
  /** Хүргэгч хайж эхэлсэн ISO цаг (migration 20); байхгүй бол эхний давалгаа */
  searchingSince?: string;
  /** Авах → хүргэх замын урт (км); 0/байхгүй бол хязгаарлахгүй */
  tripKm?: number;
}

/** Энэ хүргэгч тухайн захиалгыг хүрч чадах уу (km — авах цэг хүртэл) */
export function canReach(vehicle: string | undefined, order: DispatchOrder, km: number): boolean {
  const r = VEHICLE_REACH[vehicle ?? ""];
  if (!r) return true;
  if (order.tripKm && order.tripKm > r.tripKm) return false;
  // Авах цэг тодорхой бол хүргэгчийн байршил ч тодорхой, ойр байх ёстой
  if (order.pickup) return Number.isFinite(km) && km <= r.pickupKm;
  return true;
}

/** Санал авах эрхтэй хүргэгчид, ойрын дарааллаар (байршилгүй нь хамгийн сүүлд) */
export function rankCouriers(order: DispatchOrder, couriers: DispatchCourier[], now = Date.now()) {
  const eligible = couriers.filter((c) => c.available && c.active && c.verified);
  const fresh = (c: DispatchCourier) => !!c.pos && !!c.locAt && now - new Date(c.locAt).getTime() <= LOCATION_FRESH_MS;
  return eligible
    .map((c) => ({ c, km: order.pickup && fresh(c) ? distanceKm(order.pickup, c.pos!) : Infinity }))
    .filter((x) => canReach(x.c.vehicle, order, x.km))
    .sort((a, b) => a.km - b.km)
    .map((x) => ({ id: x.c.id, km: x.km }));
}

/** Одоогийн байдлаар хэдэн хүргэгчид санал очсон байх ёстой */
export function offerCount(order: DispatchOrder, now = Date.now()): number {
  if (!order.searchingSince) return OFFER_BATCH;
  const waves = 1 + Math.floor(Math.max(0, now - new Date(order.searchingSince).getTime()) / WAVE_MS);
  return OFFER_BATCH * waves;
}

/** Энэ хүргэгчид санал очсон уу; очсон бол авах цэг хүртэлх зай (км) */
export function offerFor(courierId: string, order: DispatchOrder, couriers: DispatchCourier[], now = Date.now()): { km: number | null } | null {
  const ranked = rankCouriers(order, couriers, now);
  const idx = ranked.findIndex((r) => r.id === courierId);
  if (idx < 0) return null;
  // Авах цэгийн байршилгүй бол бүгдэд
  if (order.pickup && idx >= offerCount(order, now)) return null;
  const km = ranked[idx].km;
  return { km: Number.isFinite(km) ? km : null };
}
