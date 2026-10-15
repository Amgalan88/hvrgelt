// Газар хайх — "Дархан бүсийн карго" гэж бичихэд байршилтайгаа гарна.
//
// Гурван эх үүсвэр, дарааллаар нь:
//   1. Апп-ын газрууд (партнёр: карго, зах, дэлгүүр, аптек ...) — супер
//      админ байршлыг нь газрын зураг дээр заасан бол шууд үнэ гарна
//   2. Хэрэглэгчийн хадгалсан хаягууд ба өмнөх захиалгын цэгүүд
//   3. Газрын зургийн хайлт — Google Places (түлхүүр тохируулсан бол),
//      үгүй бол OpenStreetMap-ийн Photon (үнэгүй, Дархан хотоор хязгаарлана)
//
// Монгол бичвэрийн ялгааг тэгшитгэнэ: "Магнолиа" = "Магнолия",
// "хургэлт" = "хүргэлт" (Монгол гаргүй утсан дээр ү, ө бичихэд төвөгтэй).

import type { LatLng } from "./geo";
import { GOOGLE_KEY, googleFailed, loadGoogleMaps } from "./googleMaps";

export type PlaceSource = "partner" | "saved" | "recent" | "map";

export interface PlaceResult {
  id: string;
  name: string;
  subtitle?: string;
  source: PlaceSource;
  /** Байршил мэдэгдэж байвал. Google-ийн үр дүнд resolve()-оор авна */
  pos?: LatLng;
  resolve?: () => Promise<LatLng | null>;
}

/** Дархан хот — хайлтыг үүгээр хязгаарлана (зүүн, урд, баруун, хойд) */
export const DARKHAN_BBOX = { west: 105.85, south: 49.42, east: 106.02, north: 49.56 };

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ү/g, "у")
    .replace(/ө/g, "о")
    .replace(/иа/g, "ия")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Үг бүр нэр/хаягийн аль нэг үгийн эхэнд, эсвэл дотор нь таарвал */
export function matchScore(query: string, text: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const t = normalize(text);
  if (t.startsWith(q)) return 3;
  const tokens = q.split(" ");
  const words = t.split(" ");
  if (tokens.every((tok) => words.some((w) => w.startsWith(tok)))) return 2;
  if (tokens.every((tok) => t.includes(tok))) return 1;
  return 0;
}

/** Апп-ын өөрийн газруудаас хайна — шууд, сүлжээ шаардахгүй */
export function searchLocal(query: string, candidates: PlaceResult[], limit = 6): PlaceResult[] {
  return candidates
    .map((c) => ({ c, score: Math.max(matchScore(query, c.name) * 2, matchScore(query, `${c.name} ${c.subtitle ?? ""}`)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.c.pos ? 1 : 0) - (a.c.pos ? 1 : 0))
    .slice(0, limit)
    .map((x) => x.c);
}

// ── Photon (OpenStreetMap) ──────────────────────────────────────────────

async function searchPhoton(query: string, signal: AbortSignal): Promise<PlaceResult[]> {
  const b = DARKHAN_BBOX;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${b.west},${b.south},${b.east},${b.north}&limit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.features ?? []).map((f: any, i: number) => {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    const sub = [p.street && `${p.street}${p.housenumber ? " " + p.housenumber : ""}`, p.district, p.city].filter(Boolean).join(", ");
    return {
      id: `osm-${p.osm_type ?? ""}${p.osm_id ?? i}`,
      name: p.name ?? p.street ?? query,
      subtitle: sub || undefined,
      source: "map" as const,
      pos: typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined,
    };
  });
}

// ── Google Places (шинэ API) ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let gSession: any = null;

async function searchGoogle(query: string): Promise<PlaceResult[]> {
  const g = await loadGoogleMaps();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const places: any = await g.maps.importLibrary("places");
  gSession = gSession ?? new places.AutocompleteSessionToken();
  const b = DARKHAN_BBOX;
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    sessionToken: gSession,
    language: "mn",
    includedRegionCodes: ["mn"],
    locationRestriction: { west: b.west, south: b.south, east: b.east, north: b.north },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (suggestions ?? []).filter((s: any) => s.placePrediction).slice(0, 6).map((s: any) => {
    const p = s.placePrediction;
    return {
      id: `g-${p.placeId}`,
      name: p.mainText?.text ?? p.text?.text ?? query,
      subtitle: p.secondaryText?.text,
      source: "map" as const,
      resolve: async () => {
        const place = p.toPlace();
        await place.fetchFields({ fields: ["location"] });
        gSession = null; // нэг сонголт = нэг session (Google-ийн төлбөрийн дүрэм)
        const loc = place.location;
        return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
      },
    };
  });
}

/** Газрын зургаас хайна — Google байвал Google, үгүй бол OpenStreetMap */
export async function searchMap(query: string, signal: AbortSignal): Promise<PlaceResult[]> {
  if (normalize(query).length < 3) return [];
  if (GOOGLE_KEY && !googleFailed()) {
    try {
      return await searchGoogle(query);
    } catch {
      /* Google ажиллахгүй бол OpenStreetMap руу */
    }
  }
  try {
    return await searchPhoton(query, signal);
  } catch {
    return [];
  }
}
