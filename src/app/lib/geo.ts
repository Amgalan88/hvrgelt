// Байршил, газрын зураг, навигацийн холбоос.
//
// Газрын зураг: OpenStreetMap + Leaflet — үнэгүй, API түлхүүр шаардахгүй.
// Навигаци: Google Maps-ийн нийтийн URL (https://developers.google.com/maps/documentation/urls)
// — түлхүүргүй, үнэгүй, утсан дээр Google Maps апп-ыг шууд нээнэ.
// Хожим Google Maps JavaScript руу шилжвэл зөвхөн MapView-г солино.

import { supabase } from "./supabase";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Дархан хотын төв — газрын зураг анх нээгдэх цэг */
export const DARKHAN_CENTER: LatLng = { lat: 49.4875, lng: 105.9330 };

export function isLatLng(v: { lat?: number | null; lng?: number | null } | null | undefined): v is LatLng {
  return !!v && typeof v.lat === "number" && typeof v.lng === "number" && Number.isFinite(v.lat) && Number.isFinite(v.lng);
}

const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * Нэг цэг рүү чиглэл гаргах. Координат байвал яг тэр цэг рүү, үгүй бол
 * хаягийн текстийг " Дархан"-тай нь хайна (өмнө нь хотын нэргүй хайдаг байв).
 */
export function navigateUrl(dest: LatLng | null | undefined, fallbackText: string): string {
  if (isLatLng(dest)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${fmt(dest)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fallbackText}, Дархан`)}`;
}

/** Авах цэгээс хүргэх цэг хүртэлх зам */
export function routeUrl(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  fromText: string,
  toText: string,
): string {
  const o = isLatLng(from) ? fmt(from) : encodeURIComponent(`${fromText}, Дархан`);
  const d = isLatLng(to) ? fmt(to) : encodeURIComponent(`${toText}, Дархан`);
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
}

/** Хоёр цэгийн шулуун зай (км) — үнэ биш, ойролцоо мэдээлэл */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type GeoError = "unsupported" | "denied" | "unavailable" | "timeout";

export function geoErrorText(e: GeoError): string {
  switch (e) {
    case "unsupported": return "Энэ төхөөрөмж байршил тодорхойлж чадахгүй байна.";
    case "denied": return "Байршлын зөвшөөрөл өгөөгүй байна. Хөтчийн тохиргооноос зөвшөөрнө үү.";
    case "timeout": return "Байршил олоход удаж байна. Задгай газар дахин оролдоно уу.";
    default: return "Байршил олдсонгүй. GPS асаалттай эсэхийг шалгана уу.";
  }
}

function toGeoError(err: GeolocationPositionError): GeoError {
  if (err.code === err.PERMISSION_DENIED) return "denied";
  if (err.code === err.TIMEOUT) return "timeout";
  return "unavailable";
}

/** Утасны одоогийн байршил — нэг удаа */
export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject("unsupported" as GeoError);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(toGeoError(e)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

// ── Хүргэгчийн байршил ──────────────────────────────────────────────────

export interface CourierLocation extends LatLng {
  courierId: string;
  accuracy?: number;
  updatedAt: string;
}

function rowToLocation(r: any): CourierLocation {
  return { courierId: r.courier_id, lat: r.lat, lng: r.lng, accuracy: r.accuracy ?? undefined, updatedAt: r.updated_at };
}

/** Хүргэгчийн байршлыг хадгална (migration 19 ажиллаагүй бол чимээгүй алгасна) */
export async function saveCourierLocation(courierId: string, pos: LatLng, accuracy?: number): Promise<boolean> {
  const { error } = await supabase.from("courier_locations").upsert({
    courier_id: courierId,
    lat: pos.lat,
    lng: pos.lng,
    accuracy: accuracy ?? null,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

/**
 * Нэг хүргэгчийн байршлыг сонсоно — эхлээд сүүлийн утгыг уншиж, дараа нь
 * Realtime-аар шинэчлэлт бүрийг дамжуулна. Буцаасан функцээр зогсооно.
 */
export function watchCourierLocation(courierId: string, onChange: (loc: CourierLocation) => void): () => void {
  let alive = true;
  supabase
    .from("courier_locations")
    .select("*")
    .eq("courier_id", courierId)
    .maybeSingle()
    .then(({ data }) => {
      if (alive && data) onChange(rowToLocation(data));
    });

  const channel = supabase
    .channel(`courier-loc-${courierId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "courier_locations", filter: `courier_id=eq.${courierId}` },
      (payload) => {
        if (alive && payload.new && (payload.new as any).courier_id) onChange(rowToLocation(payload.new));
      },
    )
    .subscribe();

  return () => {
    alive = false;
    supabase.removeChannel(channel);
  };
}

/** "2 минутын өмнө" */
export function agoText(iso: string): string {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 45) return "дөнгөж сая";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} минутын өмнө`;
  return `${Math.round(min / 60)} цагийн өмнө`;
}
