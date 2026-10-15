import { lazy, Suspense, useState } from "react";
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
  /** Анхны (эсвэл "Миний байршил"-аар шилжих) төв */
  center?: LatLng;
  zoom?: number;
  /** Цэг сонгох горим — төвд тогтмол тэмдэг, газрын зургийг чирж байрлуулна */
  pick?: MarkerKind;
  onCenterChange?: (c: LatLng) => void;
  /** Бүх тэмдэг харагдахаар томруулна */
  fit?: boolean;
  className?: string;
}

/** Апп доторх маршрутын дүрстэй ижил: ногоон цэг → улбар шар тэмдэг, хүргэгч */
export const MARKER_SVG: Record<MarkerKind, { svg: string; size: [number, number]; anchor: [number, number] }> = {
  from: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="#12a150" stroke="#fff" stroke-width="3"/></svg>`,
    size: [22, 22],
    anchor: [11, 11],
  },
  to: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><path d="M15 1C7.3 1 1.5 6.8 1.5 14.2 1.5 24 15 37 15 37s13.5-13 13.5-22.8C28.5 6.8 22.7 1 15 1z" fill="#e8531c" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
    size: [30, 38],
    anchor: [15, 37],
  },
  courier: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#e8531c" stroke-width="3"/><path d="M20 9.5 27.5 29 20 24.6 12.5 29Z" fill="#e8531c"/></svg>`,
    size: [40, 40],
    anchor: [20, 20],
  },
};


const LeafletMapView = lazy(() => import("./LeafletMapView"));
const GoogleMapView = lazy(() => import("./GoogleMapView"));

export default function MapView(props: MapViewProps) {
  // Google ачаалагдахгүй бол (түлхүүр буруу, billing идэвхгүй) OSM руу шилжинэ
  const [googleFailedHere, setGoogleFailed] = useState(false);
  const useGoogle = !!GOOGLE_KEY && !googleFailedHere && !googleFailed();
  return (
    <Suspense fallback={<div className={`${props.className ?? ""} bg-secondary animate-pulse`} />}>
      {useGoogle ? (
        <GoogleMapView {...props} onFail={() => setGoogleFailed(true)} />
      ) : (
        <LeafletMapView {...props} />
      )}
    </Suspense>
  );
}
