import { lazy, Suspense, useState } from "react";
import { Layers } from "lucide-react";
import type { LatLng } from "../../lib/geo";
import { GOOGLE_KEY, googleFailed } from "../../lib/googleMaps";

// Газрын зураг — эх үүсвэрийг автоматаар сонгоно:
//   • VITE_GOOGLE_MAPS_API_KEY тохируулсан бол Google Maps
//   • Тохируулаагүй, эсвэл түлхүүр/billing буруу бол OpenStreetMap (үнэгүй)
// Хэрэглэдэг газрууд (LocationPicker, RoutePreview) аль эх үүсвэр
// ажиллаж байгааг мэдэх шаардлагагүй.

export type MarkerKind = "from" | "to" | "courier";

export interface MapMarker {
  pos: LatLng;
  kind: MarkerKind;
}

export interface MapViewProps {
  markers?: MapMarker[];
  /** Машины замын маршрут (lib/route.ts). Байхгүй бол "from"→"to" шулуун тасархай шугам */
  route?: LatLng[] | null;
  /** Анхны (эсвэл "Миний байршил"-аар шилжих) төв */
  center?: LatLng;
  zoom?: number;
  /** Цэг сонгох горим — төвд тогтмол тэмдэг, газрын зургийг чирж байрлуулна */
  pick?: MarkerKind;
  onCenterChange?: (c: LatLng) => void;
  /** Бүх тэмдэг харагдахаар томруулна */
  fit?: boolean;
  /**
   * Бүтэн дэлгэцийн газрын зураг, баруун талыг нь самбар (px) далдална:
   * тэмдгүүдийг үлдсэн хэсэгт багтааж, товчнуудыг зүүн тийш шилжүүлнэ.
   */
  panelRight?: number;
  /** Хиймэл дагуулын зураг (нэртэй) — MapView өөрөө тавина */
  satellite?: boolean;
  /** Давхарга солих товч харуулах эсэх (анхдагч: тийм) */
  layerToggle?: boolean;
  className?: string;
}

const LAYER_KEY = "hvrgelt_map_layer";
function readLayer(): boolean {
  try { return localStorage.getItem(LAYER_KEY) !== "map"; } catch { return true; }
}

/** Сонгосон брэнд өнгө (Тохиргоо → Өнгө) — тэмдэг, маршрутын шугамд */
export function brandColor(): string {
  if (typeof document === "undefined") return "#e8531c";
  return getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#e8531c";
}

/** Апп доторх маршрутын дүрстэй ижил: ногоон цэг → брэнд өнгийн тэмдэг, хүргэгч */
export function markerSvg(kind: MarkerKind, color = brandColor()): { svg: string; size: [number, number]; anchor: [number, number] } {
  if (kind === "from") {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="#12a150" stroke="#fff" stroke-width="3"/></svg>`,
      size: [22, 22],
      anchor: [11, 11],
    };
  }
  if (kind === "to") {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><path d="M15 1C7.3 1 1.5 6.8 1.5 14.2 1.5 24 15 37 15 37s13.5-13 13.5-22.8C28.5 6.8 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
      size: [30, 38],
      anchor: [15, 37],
    };
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="${color}" stroke-width="3"/><path d="M20 9.5 27.5 29 20 24.6 12.5 29Z" fill="${color}"/></svg>`,
    size: [40, 40],
    anchor: [20, 20],
  };
}

/** Маршрут байхгүй үед "хаанаас → хаашаа" шулуун шугам */
export function routeLine(markers: MapMarker[], route?: LatLng[] | null): { path: LatLng[]; straight: boolean } | null {
  if (route && route.length > 1) return { path: route, straight: false };
  const from = markers.find((m) => m.kind === "from");
  const to = markers.find((m) => m.kind === "to");
  return from && to ? { path: [from.pos, to.pos], straight: true } : null;
}

const LeafletMapView = lazy(() => import("./LeafletMapView"));
const GoogleMapView = lazy(() => import("./GoogleMapView"));

export default function MapView({ layerToggle = true, className = "", ...props }: MapViewProps) {
  // Google ачаалагдахгүй бол (түлхүүр буруу, billing идэвхгүй) OSM руу шилжинэ
  const [googleFailedHere, setGoogleFailed] = useState(false);
  const useGoogle = !!GOOGLE_KEY && !googleFailedHere && !googleFailed();
  // Хиймэл дагуул анхдагч — хэрэглэгчийн сонголтыг төхөөрөмж дээр санана
  const [satellite, setSatellite] = useState(readLayer);
  function toggle() {
    setSatellite((s) => {
      try { localStorage.setItem(LAYER_KEY, s ? "map" : "satellite"); } catch { /* noop */ }
      return !s;
    });
  }
  const pinned = className.split(" ").some((c) => c === "absolute" || c === "fixed");
  const inner = { ...props, satellite, className: "absolute inset-0" };
  return (
    <div className={`${pinned ? "" : "relative"} overflow-hidden ${className}`}>
      <Suspense fallback={<div className="absolute inset-0 bg-secondary animate-pulse" />}>
        {useGoogle ? <GoogleMapView {...inner} onFail={() => setGoogleFailed(true)} /> : <LeafletMapView {...inner} />}
      </Suspense>
      {layerToggle && (
        <button
          type="button"
          onClick={toggle}
          className="absolute left-2.5 top-2.5 z-[600] inline-flex items-center gap-1.5 rounded-full bg-card/95 text-foreground border border-border shadow-md px-3 py-1.5 text-xs font-semibold"
          aria-label={satellite ? "Энгийн газрын зураг" : "Хиймэл дагуулын зураг"}
        >
          <Layers className="w-3.5 h-3.5 text-primary" /> {satellite ? "Газрын зураг" : "Хиймэл дагуул"}
        </button>
      )}
    </div>
  );
}
