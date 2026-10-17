// Машины замаар маршрут — газрын зураг дээр зурах, үнийг бодит замын
// зайгаар бодох.
//
// 1. Google Routes (VITE_GOOGLE_MAPS_API_KEY байвал; Cloud-д "Routes API"
//    идэвхтэй байх ёстой) — Maps JS-ийн Route.computeRoutes, браузераас.
// 2. OSRM (OpenStreetMap-ийн өгөгдөл, үнэгүй, түлхүүргүй) — Google байхгүй,
//    эсвэл алдаа гарвал. Демо сервер тул баталгаагүй.
// 3. Аль нь ч хүрэхгүй, эсвэл зам олдохгүй бол null — тэгвэл үнэ шулуун
//    зай × 1.3-аар бодогдоно (pricing.roadKm), газрын зураг дээр шулуун
//    тасархай шугам зурна.

import { useEffect, useState } from "react";
import type { LatLng } from "./geo";
import { GOOGLE_KEY, googleFailed, loadGoogleMaps } from "./googleMaps";

export interface Route {
  /** Замын урт, 0.1 км нарийвчлалтай */
  km: number;
  /** Машинаар явах хугацаа (минут) */
  minutes: number;
  path: LatLng[];
}

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const cache = new Map<string, Route | null>();

const keyOf = (a: LatLng, b: LatLng) => `${a.lat.toFixed(5)},${a.lng.toFixed(5)};${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;

const toRoute = (meters: number, seconds: number, path: LatLng[]): Route => ({
  km: Math.round((meters / 1000) * 10) / 10,
  minutes: Math.max(1, Math.round(seconds / 60)),
  path,
});

/** Удаан хариулбал 6 секундэд тасална */
function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

/**
 * Google: "found" — маршрут (эсвэл зам олдсонгүй = null), "unavailable" —
 * түлхүүргүй / Routes API идэвхгүй / алдаа → OSRM руу шилжинэ.
 */
/** Routes API идэвхгүй гэх мэт алдаа гарвал энэ сессэд Google-ийг дахин оролдохгүй */
let googleRoutesOff = false;

async function googleRoute(from: LatLng, to: LatLng): Promise<{ found: Route | null } | "unavailable"> {
  if (!GOOGLE_KEY || googleFailed() || googleRoutesOff) return "unavailable";
  try {
    const g = await withTimeout(loadGoogleMaps());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib: any = await withTimeout(g.maps.importLibrary("routes"));
    const { routes } = await withTimeout(
      lib.Route.computeRoutes({ origin: from, destination: to, travelMode: "DRIVING", fields: ["distanceMeters", "durationMillis", "path"] }),
    ) as { routes?: { distanceMeters?: number; durationMillis?: number; path?: { lat: number | (() => number); lng: number | (() => number) }[] }[] };
    const r = routes?.[0];
    if (!r?.distanceMeters) return { found: null };
    // LatLngAltitude-д lat/lng нь утга, LatLng-д функц
    const num = (v: number | (() => number)) => (typeof v === "function" ? v() : v);
    const path = (r.path ?? []).map((p) => ({ lat: num(p.lat), lng: num(p.lng) }));
    return { found: toRoute(r.distanceMeters, (r.durationMillis ?? 0) / 1000, path) };
  } catch (err) {
    console.warn("google route", err);
    googleRoutesOff = true;
    return "unavailable";
  }
}

/** OSRM: маршрут, зам олдсонгүй = null, хүрэхгүй = undefined (кэшлэхгүй) */
async function osrmRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route | null | undefined> {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  signal?.addEventListener("abort", () => ctrl.abort());
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return undefined; // түр зуурын алдааг кэшлэхгүй
    const data = await res.json();
    const r = data?.routes?.[0];
    return data?.code === "Ok" && r
      ? toRoute(r.distance, r.duration, (r.geometry?.coordinates ?? []).map(([lng, lat]: [number, number]) => ({ lat, lng })))
      : null;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route | null> {
  const key = keyOf(from, to);
  if (cache.has(key)) return cache.get(key)!;
  const g = await googleRoute(from, to);
  const route = g !== "unavailable" ? g.found : await osrmRoute(from, to, signal);
  if (route === undefined) return null;
  cache.set(key, route);
  return route;
}

/** Хоёр цэгийн маршрут. loading — үнэ үсрэхгүйн тулд хүлээх үед */
export function useRoute(from: LatLng | null | undefined, to: LatLng | null | undefined) {
  const key = from && to ? keyOf(from, to) : "";
  const [state, setState] = useState<{ key: string; route: Route | null }>({ key: "", route: null });

  useEffect(() => {
    if (!from || !to) return;
    const ctrl = new AbortController();
    // Хэрэглэгч цэгээ чирж байхад хүсэлт бүрийг илгээхгүй
    const t = setTimeout(() => {
      fetchRoute(from, to, ctrl.signal).then((route) => {
        if (!ctrl.signal.aborted) setState({ key, route });
      });
    }, cache.has(key) ? 0 : 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) return { route: null, loading: false };
  if (state.key !== key) {
    // Кэштэй бол шууд
    if (cache.has(key)) return { route: cache.get(key) ?? null, loading: false };
    return { route: null, loading: true };
  }
  return { route: state.route, loading: false };
}
